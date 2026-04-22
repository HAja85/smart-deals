from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from backend.database import get_connection
from backend.auth import decode_token

router = APIRouter(prefix="/cart", tags=["cart"])
security = HTTPBearer()


def consumer_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can use the cart")
    return payload


def _format_cart_item(row: dict) -> dict:
    d = dict(row)
    for f in ["price_per_unit", "actual_price"]:
        if d.get(f) is not None:
            d[f] = float(d[f])
    if d.get("added_at"):
        d["added_at"] = d["added_at"].isoformat()
    for ts in ["start_time", "end_time", "created_at"]:
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    if d.get("actual_price") and d.get("price_per_unit") and d["actual_price"] > 0:
        d["discount_percent"] = round(
            ((d["actual_price"] - d["price_per_unit"]) / d["actual_price"]) * 100, 1
        )
    else:
        d["discount_percent"] = 0
    if d.get("target_quantity") and d["target_quantity"] > 0:
        d["progress_percent"] = min(
            round((d.get("current_quantity", 0) / d["target_quantity"]) * 100, 1), 100
        )
    else:
        d["progress_percent"] = 0
    if d.get("price_per_unit") and d.get("quantity"):
        d["line_total"] = round(float(d["price_per_unit"]) * int(d["quantity"]), 3)
    else:
        d["line_total"] = 0.0
    return d


class CartAdd(BaseModel):
    deal_id: int
    quantity: int = 1


class CartUpdate(BaseModel):
    quantity: int


@router.get("")
def get_cart(user=Depends(consumer_only)):
    """Return all active cart items for the logged-in consumer.
    Items whose deal is no longer Active are silently excluded."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute("""
            SELECT
                ci.id AS cart_item_id,
                ci.user_id,
                ci.deal_id,
                ci.quantity,
                ci.added_at,
                d.product_id,
                d.target_quantity,
                d.current_quantity,
                d.price_per_unit,
                d.actual_price,
                d.start_time,
                d.end_time,
                d.status AS deal_status,
                p.title AS product_title,
                p.image AS product_image,
                p.brand AS product_brand,
                p.unit AS product_unit,
                p.category AS product_category,
                p.seller_name
            FROM cart_items ci
            JOIN deals d ON ci.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            WHERE ci.user_id = %s
              AND d.status = 'Active'
            ORDER BY ci.added_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        items = [_format_cart_item(dict(r)) for r in rows]

        cart_total = sum(i.get("line_total", 0) for i in items)
        return {
            "items": items,
            "item_count": len(items),
            "cart_total": round(cart_total, 3),
        }
    finally:
        cur.close()
        conn.close()


@router.post("")
def add_to_cart(data: CartAdd, user=Depends(consumer_only)):
    """Add a deal to the cart, or update quantity if already there."""
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])

        cur.execute("SELECT id, status, end_time FROM deals WHERE id = %s", (data.deal_id,))
        deal = cur.fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        if dict(deal)["status"] != "Active":
            raise HTTPException(status_code=400, detail="Only Active deals can be added to cart")

        cur.execute("""
            INSERT INTO cart_items (user_id, deal_id, quantity)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, deal_id)
            DO UPDATE SET quantity = %s, added_at = NOW()
            RETURNING *
        """, (user_id, data.deal_id, data.quantity, data.quantity))
        item = dict(cur.fetchone())
        conn.commit()
        return {"message": "Added to cart", "cart_item_id": item["id"], "quantity": item["quantity"]}
    finally:
        cur.close()
        conn.close()


@router.put("/{deal_id}")
def update_cart_item(deal_id: int, data: CartUpdate, user=Depends(consumer_only)):
    """Update the quantity of a cart item."""
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute(
            "UPDATE cart_items SET quantity = %s WHERE user_id = %s AND deal_id = %s RETURNING id",
            (data.quantity, user_id, deal_id)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Cart item not found")
        conn.commit()
        return {"message": "Cart updated", "quantity": data.quantity}
    finally:
        cur.close()
        conn.close()


@router.delete("/{deal_id}")
def remove_from_cart(deal_id: int, user=Depends(consumer_only)):
    """Remove a deal from the cart."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute(
            "DELETE FROM cart_items WHERE user_id = %s AND deal_id = %s RETURNING id",
            (user_id, deal_id)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Cart item not found")
        conn.commit()
        return {"message": "Removed from cart"}
    finally:
        cur.close()
        conn.close()


@router.delete("")
def clear_cart(user=Depends(consumer_only)):
    """Remove all items from cart."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute("DELETE FROM cart_items WHERE user_id = %s", (user_id,))
        conn.commit()
        return {"message": "Cart cleared"}
    finally:
        cur.close()
        conn.close()
