from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from backend.database import get_connection
from backend.auth import decode_token

router = APIRouter(prefix="/push", tags=["push"])
security = HTTPBearer()


def required_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


class PushTokenBody(BaseModel):
    token: str
    platform: str = "expo"


@router.post("/register")
def register_push_token(data: PushTokenBody, user=Depends(required_user)):
    """Register an Expo push token for the authenticated user."""
    if not data.token or not data.token.strip():
        raise HTTPException(status_code=400, detail="Token is required")

    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute("""
            INSERT INTO push_tokens (user_id, token, platform)
            VALUES (%s, %s, %s)
            ON CONFLICT (token) DO UPDATE SET user_id = %s, platform = %s
        """, (user_id, data.token.strip(), data.platform, user_id, data.platform))
        conn.commit()
        return {"message": "Push token registered"}
    finally:
        cur.close()
        conn.close()


@router.post("/unregister")
def unregister_push_token(data: PushTokenBody, user=Depends(required_user)):
    """Remove an Expo push token (e.g. on logout)."""
    if not data.token or not data.token.strip():
        raise HTTPException(status_code=400, detail="Token is required")

    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute(
            "DELETE FROM push_tokens WHERE token = %s AND user_id = %s",
            (data.token.strip(), user_id)
        )
        conn.commit()
        return {"message": "Push token removed"}
    finally:
        cur.close()
        conn.close()
