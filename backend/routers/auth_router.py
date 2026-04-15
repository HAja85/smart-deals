import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

OTP_EXPIRY_MINUTES = 10


def _gen_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


class SendOtpRequest(BaseModel):
    target: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    mobile_number: str
    email_otp: str
    mobile_otp: str
    image: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


def format_user(row: dict, token: str = None) -> dict:
    return {
        "_id": row["id"],
        "id": row["id"],
        "name": row["name"],
        "displayName": row["name"],
        "email": row["email"],
        "image": row.get("image") or "",
        "photoURL": row.get("image") or "",
        "role": row.get("role", "consumer"),
        "mobile_number": row.get("mobile_number") or "",
        **({"accessToken": token} if token else {}),
    }


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


@router.post("/send-email-otp")
def send_email_otp(req: SendOtpRequest):
    email = req.target.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email address is required")

    otp = _gen_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE email_otps SET used = TRUE WHERE email = %s AND used = FALSE",
            (email,),
        )
        cur.execute(
            "INSERT INTO email_otps (email, otp, expires_at) VALUES (%s, %s, %s)",
            (email, otp, expires_at),
        )
        conn.commit()
        return {
            "message": f"OTP sent to {email}",
            "otp": otp,
            "expires_in_minutes": OTP_EXPIRY_MINUTES,
            "demo_mode": True,
        }
    finally:
        cur.close()
        conn.close()


@router.post("/send-mobile-otp")
def send_mobile_otp(req: SendOtpRequest):
    mobile = req.target.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required")

    otp = _gen_otp()
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


@router.post("/register")
def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    email = req.email.strip().lower()
    mobile = req.mobile_number.strip()

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        cur.execute(
            "SELECT id, expires_at FROM email_otps WHERE email = %s AND otp = %s AND used = FALSE ORDER BY created_at DESC LIMIT 1",
            (email, req.email_otp.strip()),
        )
        email_rec = cur.fetchone()
        if not email_rec:
            raise HTTPException(status_code=400, detail="Invalid email OTP. Please request a new one.")
        if datetime.utcnow() > email_rec["expires_at"]:
            raise HTTPException(status_code=400, detail="Email OTP has expired. Please request a new one.")

        cur.execute(
            "SELECT id, expires_at FROM otp_verifications WHERE mobile_number = %s AND otp = %s AND used = FALSE ORDER BY created_at DESC LIMIT 1",
            (mobile, req.mobile_otp.strip()),
        )
        mobile_rec = cur.fetchone()
        if not mobile_rec:
            raise HTTPException(status_code=400, detail="Invalid mobile OTP. Please request a new one.")
        if datetime.utcnow() > mobile_rec["expires_at"]:
            raise HTTPException(status_code=400, detail="Mobile OTP has expired. Please request a new one.")

        cur.execute("UPDATE email_otps SET used = TRUE WHERE id = %s", (email_rec["id"],))
        cur.execute("UPDATE otp_verifications SET used = TRUE WHERE id = %s", (mobile_rec["id"],))

        hashed = hash_password(req.password)
        cur.execute(
            "INSERT INTO users (name, email, password_hash, image, role, mobile_number, is_verified) VALUES (%s, %s, %s, %s, %s, %s, TRUE) RETURNING *",
            (req.name, email, hashed, req.image, "consumer", mobile),
        )
        user = dict(cur.fetchone())
        conn.commit()

        token = create_access_token({"sub": str(user["id"]), "email": user["email"], "role": user["role"]})
        return {"user": format_user(user, token), "token": token}
    finally:
        cur.close()
        conn.close()


@router.post("/login")
def login(req: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = dict(user)
        if not user.get("password_hash"):
            raise HTTPException(status_code=401, detail="This account uses social login")

        if not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({"sub": str(user["id"]), "email": user["email"], "role": user.get("role", "consumer")})
        return {"user": format_user(user, token), "token": token}
    finally:
        cur.close()
        conn.close()


@router.get("/me")
def get_me(payload: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users WHERE id = %s", (int(payload["sub"]),))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return format_user(dict(user))
    finally:
        cur.close()
        conn.close()
