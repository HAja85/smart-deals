import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.auth import decode_token, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

OTP_EXPIRY_MINUTES = 10


def admin_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


class SendOtpRequest(BaseModel):
    mobile_number: str


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    mobile_number: str
    otp: str
    image: Optional[str] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = None


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


@router.post("/send-otp")
def send_otp(req: SendOtpRequest, _=Depends(admin_only)):
    mobile = req.mobile_number.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required")

    otp = _generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE otp_verifications SET used = TRUE WHERE mobile_number = %s AND used = FALSE",
            (mobile,),
        )
        cur.execute(
            "INSERT INTO otp_verifications (mobile_number, otp, expires_at) VALUES (%s, %s, %s)",
            (mobile, otp, expires_at),
        )
        conn.commit()
        return {
            "message": f"OTP sent to {mobile}",
            "otp": otp,
            "expires_in_minutes": OTP_EXPIRY_MINUTES,
            "demo_mode": True,
        }
    finally:
        cur.close()
        conn.close()


@router.post("/create-user")
def create_user(req: CreateUserRequest, _=Depends(admin_only)):
    mobile = req.mobile_number.strip()
    role = req.role if req.role in ("consumer", "supplier") else "consumer"

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, used, expires_at FROM otp_verifications
            WHERE mobile_number = %s AND otp = %s AND used = FALSE
            ORDER BY created_at DESC LIMIT 1
            """,
            (mobile, req.otp.strip()),
        )
        record = cur.fetchone()
        if not record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

        cur.execute("SELECT id FROM users WHERE email = %s", (req.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email is already registered")

        cur.execute("UPDATE otp_verifications SET used = TRUE WHERE id = %s", (record["id"],))

        hashed = hash_password(req.password)
        cur.execute(
            """
            INSERT INTO users (name, email, password_hash, image, role, mobile_number, is_verified)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE) RETURNING id, name, email, role, mobile_number, is_verified, created_at
            """,
            (req.name, req.email, hashed, req.image, role, mobile),
        )
        user = dict(cur.fetchone())
        conn.commit()
        return {"message": "User created successfully", "user": user}
    finally:
        cur.close()
        conn.close()


@router.get("/users")
def list_users(_=Depends(admin_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, name, email, role, mobile_number, is_verified, image, created_at
            FROM users ORDER BY created_at DESC
            """
        )
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@router.patch("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, _=Depends(admin_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        updates, params = [], []
        if req.name is not None:
            updates.append("name = %s"); params.append(req.name)
        if req.role is not None and req.role in ("consumer", "supplier", "admin"):
            updates.append("role = %s"); params.append(req.role)
        if req.is_verified is not None:
            updates.append("is_verified = %s"); params.append(req.is_verified)
        if not updates:
            raise HTTPException(status_code=400, detail="Nothing to update")

        params.append(user_id)
        cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return {"message": "User updated"}
    finally:
        cur.close()
        conn.close()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin=Depends(admin_only)):
    if str(user_id) == admin.get("sub"):
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, role FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        if dict(u)["role"] == "admin":
            raise HTTPException(status_code=403, detail="Cannot delete admin accounts")
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return {"message": "User deleted"}
    finally:
        cur.close()
        conn.close()


@router.get("/stats")
def get_stats(_=Depends(admin_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT role, COUNT(*) c FROM users GROUP BY role")
        by_role = {r["role"]: r["c"] for r in cur.fetchall()}
        cur.execute("SELECT COUNT(*) c FROM users WHERE is_verified = TRUE")
        verified = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) c FROM users WHERE created_at >= NOW() - INTERVAL '7 days'")
        new_week = cur.fetchone()["c"]
        return {
            "total": sum(by_role.values()),
            "by_role": by_role,
            "verified": verified,
            "new_this_week": new_week,
        }
    finally:
        cur.close()
        conn.close()
