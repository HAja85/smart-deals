from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.database import get_connection
from backend.auth import decode_token

router = APIRouter(prefix="/notifications", tags=["notifications"])
security = HTTPBearer()


def required_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def format_notif(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("")
def get_notifications(user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (int(user["sub"]),)
        )
        rows = cur.fetchall()
        notifs = [format_notif(dict(r)) for r in rows]
        unread_count = sum(1 for n in notifs if not n["is_read"])
        return {"notifications": notifs, "unread_count": unread_count}
    finally:
        cur.close()
        conn.close()


@router.post("/{notif_id}/read")
def mark_read(notif_id: int, user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
            (notif_id, int(user["sub"]))
        )
        conn.commit()
        return {"message": "Marked as read"}
    finally:
        cur.close()
        conn.close()


@router.post("/read-all")
def mark_all_read(user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
            (int(user["sub"]),)
        )
        conn.commit()
        return {"message": "All marked as read"}
    finally:
        cur.close()
        conn.close()


def create_notification(conn, user_id: int, title: str, message: str, notif_type: str = "System", deal_id: int = None):
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO notifications (user_id, title, message, type, deal_id)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, title, message, notif_type, deal_id)
        )
    finally:
        cur.close()
