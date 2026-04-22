import httpx
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/push/send"


def send_push(tokens: list[str], title: str, body: str, data: dict = None):
    """Send push notifications to a list of Expo push tokens.
    
    Uses the Expo Push API which covers both FCM (Android) and APNs (iOS).
    Silently ignores failures so as not to break business logic.
    """
    if not tokens:
        return

    if data is None:
        data = {}

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data,
            "sound": "default",
            "priority": "high",
        }
        for token in tokens
        if token and (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken["))
    ]

    if not messages:
        return

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code != 200:
                logger.warning(f"Expo push returned {response.status_code}: {response.text[:200]}")
    except Exception as e:
        logger.warning(f"Push notification failed (non-fatal): {e}")


def get_user_tokens(conn, user_id: int) -> list[str]:
    """Fetch all push tokens for a user from the database."""
    cur = conn.cursor()
    try:
        cur.execute("SELECT token FROM push_tokens WHERE user_id = %s", (user_id,))
        rows = cur.fetchall()
        return [r["token"] for r in rows]
    finally:
        cur.close()


def get_users_tokens(conn, user_ids: list[int]) -> list[str]:
    """Fetch all push tokens for multiple users."""
    if not user_ids:
        return []
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT token FROM push_tokens WHERE user_id = ANY(%s)",
            (user_ids,)
        )
        rows = cur.fetchall()
        return [r["token"] for r in rows]
    finally:
        cur.close()
