from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from backend.database import get_connection
from backend.auth import decode_token
from backend.services.payment_service import cancel_payment

router = APIRouter(prefix="/deals", tags=["deals"])
security = HTTPBearer(auto_error=False)


def optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    return decode_token(credentials.credentials)


def required_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def supplier_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can perform this action")
    return payload


def format_deal(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    for f in ["price_per_unit", "actual_price"]:
        if d.get(f) is not None:
            d[f] = float(d[f])
    for ts in ["start_time", "end_time", "created_at"]:
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    if d.get("actual_price") and d.get("price_per_unit") and d["actual_price"] > 0:
        d["discount_percent"] = round(((d["actual_price"] - d["price_per_unit"]) / d["actual_price"]) * 100, 1)
    else:
        d["discount_percent"] = 0
    return d


def get_deal_with_product(cur, deal_row: dict) -> dict:
    d = format_deal(deal_row)
    cur.execute(
        "SELECT id, title, image, brand, unit, category, description, seller_name, seller_image FROM products WHERE id = %s",
        (deal_row["product_id"],)
    )
    product = cur.fetchone()
    d["product"] = dict(product) if product else {}
    progress = 0
    if d.get("target_quantity") and d["target_quantity"] > 0:
        progress = round((d.get("current_quantity", 0) / d["target_quantity"]) * 100, 1)
    d["progress_percent"] = min(progress, 100)
    return d


class DealCreate(BaseModel):
    product_id: int
    target_quantity: int
    actual_price: Optional[float] = None
    price_per_unit: float
    start_time: str
    end_time: str


class DealUpdate(BaseModel):
    target_quantity: Optional[int] = None
    actual_price: Optional[float] = None
    price_per_unit: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


def parse_dt(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {s}")


@router.get("")
def get_deals(
    status: Optional[str] = Query(None),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if status:
            cur.execute("SELECT COUNT(*) AS total FROM deals WHERE status = %s", (status,))
        else:
            cur.execute("SELECT COUNT(*) AS total FROM deals")
        total = cur.fetchone()["total"]

        if status:
            cur.execute(
                "SELECT * FROM deals WHERE status = %s ORDER BY start_time DESC, id DESC LIMIT %s OFFSET %s",
                (status, limit, offset),
            )
        else:
            cur.execute(
                "SELECT * FROM deals ORDER BY start_time DESC, id DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
        rows = cur.fetchall()
        items = [get_deal_with_product(cur, dict(r)) for r in rows]
        return {"items": items, "total": total, "has_more": offset + len(items) < total}
    finally:
        cur.close()
        conn.close()


@router.get("/my-deals")
def get_my_deals(user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE seller_id = %s ORDER BY id DESC", (int(user["sub"]),))
        rows = cur.fetchall()
        return [get_deal_with_product(cur, dict(r)) for r in rows]
    finally:
        cur.close()
        conn.close()


@router.get("/upcoming")
def get_upcoming_deals():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE status = 'Upcoming' ORDER BY start_time ASC LIMIT 6")
        rows = cur.fetchall()
        return [get_deal_with_product(cur, dict(r)) for r in rows]
    finally:
        cur.close()
        conn.close()


@router.get("/{deal_id}/orders")
def get_deal_orders(deal_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT seller_id FROM deals WHERE id = %s", (deal_id,))
        deal = cur.fetchone()
        if not deal or deal["seller_id"] != int(user["sub"]):
            raise HTTPException(status_code=403, detail="Access denied")
        cur.execute("""
            SELECT o.id, o.quantity, o.total_amount, o.payment_status, o.created_at,
                   u.name as buyer_name, u.email as buyer_email, u.image as buyer_image
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.deal_id = %s
            ORDER BY o.created_at DESC
        """, (deal_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            if d.get("total_amount"):
                d["total_amount"] = float(d["total_amount"])
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@router.get("/{deal_id}")
def get_deal(deal_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deal not found")
        return get_deal_with_product(cur, dict(row))
    finally:
        cur.close()
        conn.close()


@router.post("")
def create_deal(data: DealCreate, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM products WHERE id = %s AND seller_id = %s", (data.product_id, int(user["sub"])))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You can only create deals for your own products")

        start_time = parse_dt(data.start_time)
        end_time = parse_dt(data.end_time)

        if end_time <= start_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")

        now = datetime.now(timezone.utc)
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        status = "Active" if start_time <= now else "Upcoming"

        cur.execute(
            """INSERT INTO deals (product_id, seller_id, target_quantity, actual_price, price_per_unit, start_time, end_time, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (data.product_id, int(user["sub"]), data.target_quantity,
             data.actual_price, data.price_per_unit, start_time, end_time, status),
        )
        row = cur.fetchone()
        conn.commit()
        return get_deal_with_product(cur, dict(row))
    finally:
        cur.close()
        conn.close()


@router.patch("/{deal_id}")
def update_deal(deal_id: int, data: DealUpdate, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE id = %s AND seller_id = %s", (deal_id, int(user["sub"])))
        deal = cur.fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found or access denied")
        deal = dict(deal)

        if deal["status"] in ("Successful", "Failed", "Stopped"):
            raise HTTPException(status_code=400, detail="Cannot edit a completed or stopped deal")

        updates = []
        values = []

        if data.target_quantity is not None:
            updates.append("target_quantity = %s")
            values.append(data.target_quantity)
        if data.actual_price is not None:
            updates.append("actual_price = %s")
            values.append(data.actual_price)
        if data.price_per_unit is not None:
            updates.append("price_per_unit = %s")
            values.append(data.price_per_unit)
        if data.end_time is not None:
            end_time = parse_dt(data.end_time)
            updates.append("end_time = %s")
            values.append(end_time)
        if data.start_time is not None and deal["status"] == "Upcoming":
            start_time = parse_dt(data.start_time)
            now = datetime.now(timezone.utc)
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            new_status = "Active" if start_time <= now else "Upcoming"
            updates.append("start_time = %s")
            values.append(start_time)
            updates.append("status = %s")
            values.append(new_status)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(deal_id)
        cur.execute(f"UPDATE deals SET {', '.join(updates)} WHERE id = %s RETURNING *", values)
        row = cur.fetchone()
        conn.commit()
        return get_deal_with_product(cur, dict(row))
    finally:
        cur.close()
        conn.close()


@router.post("/{deal_id}/stop")
def stop_deal(deal_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE id = %s AND seller_id = %s", (deal_id, int(user["sub"])))
        deal = cur.fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found or access denied")
        deal = dict(deal)
        if deal["status"] in ("Successful", "Failed", "Stopped"):
            raise HTTPException(status_code=400, detail="Deal is already completed or stopped")

        cur.execute("UPDATE deals SET status = 'Stopped' WHERE id = %s", (deal_id,))
        cur.execute("UPDATE orders SET payment_status = 'Cancelled' WHERE deal_id = %s AND payment_status = 'Pending'", (deal_id,))
        conn.commit()
        return {"message": "Deal stopped successfully"}
    finally:
        cur.close()
        conn.close()


@router.post("/{deal_id}/cancel-refund")
def cancel_deal_refund_all(deal_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE id = %s AND seller_id = %s", (deal_id, int(user["sub"])))
        deal = cur.fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found or access denied")
        deal = dict(deal)
        if deal["status"] in ("Successful", "Failed", "Stopped"):
            raise HTTPException(status_code=400, detail="Deal is already completed or stopped")

        cur.execute(
            "SELECT id, stripe_payment_intent_id, user_id FROM orders WHERE deal_id = %s AND payment_status = 'Authorized'",
            (deal_id,)
        )
        authorized_orders = cur.fetchall()

        refunded = 0
        failed = 0
        for order in authorized_orders:
            pi_id = order["stripe_payment_intent_id"]
            if pi_id and cancel_payment(pi_id):
                cur.execute(
                    "UPDATE orders SET payment_status = 'Cancelled' WHERE id = %s",
                    (order["id"],)
                )
                refunded += 1
                try:
                    product_title = deal.get("product_id", "")
                    cur.execute("SELECT title FROM products WHERE id = %s", (deal["product_id"],))
                    prod = cur.fetchone()
                    title = prod["title"] if prod else "your deal"
                    cur.execute(
                        """INSERT INTO notifications (user_id, title, message, type, deal_id)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (
                            order["user_id"],
                            "Deal Cancelled — Payment Released",
                            f'The deal for "{title}" has been cancelled by the supplier. '
                            f'Your payment authorization has been released and no charge was made.',
                            "Deal",
                            deal_id,
                        )
                    )
                except Exception:
                    pass
            else:
                failed += 1

        cur.execute(
            "UPDATE orders SET payment_status = 'Cancelled' WHERE deal_id = %s AND payment_status = 'Pending'",
            (deal_id,)
        )
        cur.execute("UPDATE deals SET status = 'Stopped' WHERE id = %s", (deal_id,))
        conn.commit()

        return {
            "message": "Deal cancelled and all payments released",
            "authorized_refunded": refunded,
            "stripe_failures": failed,
        }
    finally:
        cur.close()
        conn.close()
