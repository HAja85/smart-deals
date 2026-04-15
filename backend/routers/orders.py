from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timezone
from backend.database import get_connection
from backend.auth import decode_token
from backend.services.payment_service import create_payment_intent

router = APIRouter(prefix="/orders", tags=["orders"])
security = HTTPBearer()


def required_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def consumer_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can place orders")
    return payload


def format_order(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    if d.get("total_amount") is not None:
        d["total_amount"] = float(d["total_amount"])
    if d.get("refund_amount") is not None:
        d["refund_amount"] = float(d["refund_amount"])
    for ts in ["created_at", "paid_at", "refund_time"]:
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    return d


class OrderCreate(BaseModel):
    deal_id: int
    quantity: int


@router.post("")
def create_order(data: OrderCreate, user=Depends(consumer_only)):
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM deals WHERE id = %s", (data.deal_id,))
        deal = cur.fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        deal = dict(deal)
        if deal["status"] != "Active":
            raise HTTPException(status_code=400, detail="This deal is no longer active")

        now = datetime.now(timezone.utc)
        end_time = deal["end_time"]
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        if now >= end_time:
            raise HTTPException(status_code=400, detail="This deal has expired")

        total_amount = float(deal["price_per_unit"]) * data.quantity

        cur.execute(
            """INSERT INTO orders (user_id, deal_id, quantity, total_amount, payment_status)
               VALUES (%s, %s, %s, %s, 'Pending') RETURNING *""",
            (int(user["sub"]), data.deal_id, data.quantity, total_amount),
        )
        order = dict(cur.fetchone())
        order_id = order["id"]

        payment = create_payment_intent(order_id, total_amount)
        client_secret = payment.get("client_secret")
        intent_id = payment.get("payment_intent_id")

        cur.execute(
            "UPDATE orders SET stripe_payment_intent_id = %s, stripe_client_secret = %s WHERE id = %s",
            (intent_id, client_secret, order_id),
        )
        order["stripe_payment_intent_id"] = intent_id
        order["stripe_client_secret"] = client_secret

        new_qty = deal["current_quantity"] + data.quantity
        cur.execute("UPDATE deals SET current_quantity = %s WHERE id = %s", (new_qty, data.deal_id))

        if new_qty >= deal["target_quantity"]:
            cur.execute("UPDATE deals SET status = 'Successful' WHERE id = %s", (data.deal_id,))

        conn.commit()
        return format_order(order)
    finally:
        cur.close()
        conn.close()


@router.post("/{order_id}/confirm-payment")
def confirm_payment(order_id: int, user=Depends(consumer_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM orders WHERE id = %s AND user_id = %s", (order_id, int(user["sub"])))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order = dict(order)
        if order["payment_status"] == "Authorized":
            return format_order(order)

        cur.execute(
            "UPDATE orders SET payment_status = 'Authorized', paid_at = NOW() WHERE id = %s RETURNING *",
            (order_id,)
        )
        updated = dict(cur.fetchone())
        conn.commit()
        return format_order(updated)
    finally:
        cur.close()
        conn.close()


@router.get("/my-orders")
def get_my_orders(user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.*,
                   d.price_per_unit, d.actual_price, d.target_quantity, d.current_quantity, d.status as deal_status,
                   d.end_time, d.product_id,
                   p.title as product_title, p.image as product_image, p.brand as product_brand,
                   p.unit as product_unit, p.category as product_category
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            WHERE o.user_id = %s
            ORDER BY o.id DESC
        """, (int(user["sub"]),))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            for amt in ["total_amount", "price_per_unit", "actual_price", "refund_amount"]:
                if d.get(amt) is not None:
                    d[amt] = float(d[amt])
            for ts in ["created_at", "end_time", "paid_at", "refund_time"]:
                if d.get(ts):
                    d[ts] = d[ts].isoformat()
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()
