from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_connection
from backend.auth import decode_token
from backend.services.payment_service import create_payment_intent, verify_payment_authorized, cancel_payment

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
    """Return cart items for the logged-in consumer.
    Active items (orderable) and expired/ended items (shown with warning banner
    for client-driven auto-removal) are both returned."""
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
                p.seller_name,
                (d.status <> 'Active' OR d.end_time < NOW()) AS is_expired
            FROM cart_items ci
            JOIN deals d ON ci.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            WHERE ci.user_id = %s
            ORDER BY is_expired ASC, ci.added_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        items = [_format_cart_item(dict(r)) for r in rows]

        active_items = [i for i in items if not i.get("is_expired")]
        cart_total = sum(i.get("line_total", 0) for i in active_items)
        return {
            "items": items,
            "item_count": len(active_items),
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


class CartCheckoutRequest(BaseModel):
    delivery_address: str
    mobile_number: str


class ConfirmCheckoutRequest(BaseModel):
    order_ids: List[int]


@router.post("/checkout")
def cart_checkout(data: CartCheckoutRequest, user=Depends(consumer_only)):
    """Create orders for all active cart items, one Stripe PaymentIntent per order,
    so each deal can be captured/cancelled independently at settlement time."""
    if not data.delivery_address.strip():
        raise HTTPException(status_code=400, detail="Delivery address is required")
    if not data.mobile_number.strip():
        raise HTTPException(status_code=400, detail="Mobile number is required")

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        cur.execute("""
            SELECT ci.deal_id, ci.quantity,
                   d.price_per_unit, d.actual_price, d.status, d.seller_id,
                   p.title AS product_title
            FROM cart_items ci
            JOIN deals d ON ci.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            WHERE ci.user_id = %s AND d.status = 'Active' AND d.end_time > NOW()
            ORDER BY ci.added_at DESC
        """, (user_id,))
        items = [dict(r) for r in cur.fetchall()]
        if not items:
            raise HTTPException(status_code=400, detail="Your cart is empty or all deals have ended")

        created_orders = []
        cart_total_kwd = 0.0
        for item in items:
            price = float(item["price_per_unit"])
            qty = item["quantity"]
            line_total = round(price * qty, 3)
            cart_total_kwd += line_total
            cur.execute("""
                INSERT INTO orders
                    (user_id, deal_id, quantity, total_amount, payment_status, delivery_address, mobile_number)
                VALUES (%s, %s, %s, %s, 'Pending', %s, %s)
                RETURNING id, deal_id, quantity, total_amount
            """, (user_id, item["deal_id"], qty, line_total,
                  data.delivery_address.strip(), data.mobile_number.strip()))
            order_row = dict(cur.fetchone())
            order_id = order_row["id"]
            pi_data = create_payment_intent(order_id, line_total, user_id=user_id)
            cur.execute(
                "UPDATE orders SET stripe_payment_intent_id = %s, stripe_client_secret = %s WHERE id = %s",
                (pi_data["payment_intent_id"], pi_data["client_secret"], order_id),
            )
            cur.execute(
                "UPDATE deals SET current_quantity = current_quantity + %s WHERE id = %s",
                (qty, item["deal_id"]),
            )
            created_orders.append({
                **order_row,
                "client_secret": pi_data["client_secret"],
            })

        cur.execute("DELETE FROM cart_items WHERE user_id = %s", (user_id,))
        conn.commit()

        order_ids = [o["id"] for o in created_orders]
        return {
            "order_ids": order_ids,
            "orders": [
                {
                    "id": o["id"],
                    "deal_id": o["deal_id"],
                    "quantity": o["quantity"],
                    "total_amount": float(o["total_amount"]),
                    "client_secret": o["client_secret"],
                }
                for o in created_orders
            ],
            "cart_total": round(cart_total_kwd, 3),
            "stripe_client_secret": created_orders[0]["client_secret"] if len(created_orders) == 1 else None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/confirm-checkout")
def confirm_checkout(data: ConfirmCheckoutRequest, user=Depends(consumer_only)):
    """Mark orders as Authorized after verifying Stripe PaymentIntent status server-side."""
    if not data.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        placeholders = ",".join(["%s"] * len(data.order_ids))
        cur.execute(
            f"""SELECT id, stripe_payment_intent_id, payment_status
                FROM orders
                WHERE id IN ({placeholders}) AND user_id = %s""",
            data.order_ids + [user_id],
        )
        rows = [dict(r) for r in cur.fetchall()]
        if len(rows) != len(data.order_ids):
            raise HTTPException(status_code=403, detail="One or more orders not found for this user")

        pi_ids = {r["stripe_payment_intent_id"] for r in rows if r.get("stripe_payment_intent_id")}
        if not pi_ids:
            raise HTTPException(status_code=400, detail="No Stripe payment intent found for these orders")

        for pi_id in pi_ids:
            is_ok, err_msg = verify_payment_authorized(pi_id, user_id)
            if not is_ok:
                raise HTTPException(
                    status_code=402,
                    detail=f"Payment not verified: {err_msg}. Please complete your payment."
                )

        cur.execute(
            f"""UPDATE orders
               SET payment_status = 'Authorized', paid_at = NOW()
               WHERE id IN ({placeholders}) AND user_id = %s AND payment_status = 'Pending'
               RETURNING id""",
            data.order_ids + [user_id],
        )
        updated_ids = [dict(r)["id"] for r in cur.fetchall()]
        conn.commit()
        return {"confirmed_order_ids": updated_ids, "count": len(updated_ids)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/cancel-checkout")
def cancel_checkout(data: ConfirmCheckoutRequest, user=Depends(consumer_only)):
    """Cancel pending orders (payment failed), cancel Stripe PI, and restore cart items."""
    if not data.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        user_id = int(user["sub"])
        placeholders = ",".join(["%s"] * len(data.order_ids))
        cur.execute(
            f"""SELECT id, deal_id, quantity, stripe_payment_intent_id, payment_status
                FROM orders
                WHERE id IN ({placeholders}) AND user_id = %s AND payment_status = 'Pending'""",
            data.order_ids + [user_id],
        )
        rows = [dict(r) for r in cur.fetchall()]

        pi_ids = {r["stripe_payment_intent_id"] for r in rows if r.get("stripe_payment_intent_id")}
        for pi_id in pi_ids:
            cancel_payment(pi_id)

        if rows:
            order_ids_to_cancel = [r["id"] for r in rows]
            cancel_ph = ",".join(["%s"] * len(order_ids_to_cancel))
            cur.execute(
                f"UPDATE orders SET payment_status = 'Cancelled' WHERE id IN ({cancel_ph})",
                order_ids_to_cancel,
            )
            for r in rows:
                cur.execute(
                    "UPDATE deals SET current_quantity = GREATEST(0, current_quantity - %s) WHERE id = %s",
                    (r["quantity"], r["deal_id"]),
                )
                cur.execute("""
                    INSERT INTO cart_items (user_id, deal_id, quantity)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id, deal_id) DO UPDATE SET quantity = EXCLUDED.quantity, added_at = NOW()
                """, (user_id, r["deal_id"], r["quantity"]))

        conn.commit()
        return {"message": "Checkout cancelled and cart restored", "cancelled": len(rows)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
