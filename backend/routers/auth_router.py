from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    image: Optional[str] = None
    role: Optional[str] = "consumer"


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
        **({"accessToken": token} if token else {}),
    }


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


@router.post("/register")
def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    role = req.role if req.role in ("supplier", "consumer") else "consumer"

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (req.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(req.password)
        cur.execute(
            "INSERT INTO users (name, email, password_hash, image, role) VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (req.name, req.email, hashed, req.image, role),
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
