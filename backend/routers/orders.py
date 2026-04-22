from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from backend.database import get_connection
from backend.auth import decode_token
from backend.services.payment_service import create_payment_intent, cancel_payment
from backend.routers.notifications import create_notification
from backend.services.pdf_service import generate_invoice, generate_delivery_note

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
    delivery_address: Optional[str] = None
    mobile_number: Optional[str] = None


@router.post("")
def create_order(data: OrderCreate, user=Depends(consumer_only)):
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if not data.delivery_address or not data.delivery_address.strip():
        raise HTTPException(status_code=400, detail="Delivery address is required")
    if not data.mobile_number or not data.mobile_number.strip():
        raise HTTPException(status_code=400, detail="Mobile number is required")

    conn = get_connection()
    conn.autocommit = False  # explicit transaction for concurrency safety
    cur = conn.cursor()
    try:
        # SELECT FOR UPDATE: row-level lock prevents concurrent quantity drift.
        # Any parallel request for the same deal will wait here until we commit.
        cur.execute("SELECT * FROM deals WHERE id = %s FOR UPDATE", (data.deal_id,))
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
            """INSERT INTO orders (user_id, deal_id, quantity, total_amount, payment_status,
                                   delivery_address, mobile_number)
               VALUES (%s, %s, %s, %s, 'Pending', %s, %s) RETURNING *""",
            (int(user["sub"]), data.deal_id, data.quantity, total_amount,
             data.delivery_address.strip(), data.mobile_number.strip()),
        )
        order = dict(cur.fetchone())
        order_id = order["id"]

        order_number = f"ORD-{order_id:06d}"
        cur.execute("UPDATE orders SET order_number = %s WHERE id = %s", (order_number, order_id))
        order["order_number"] = order_number

        # Atomic increment — no read-modify-write gap; returns the true new value
        cur.execute(
            """UPDATE deals
               SET current_quantity = current_quantity + %s
               WHERE id = %s
               RETURNING current_quantity, target_quantity, status""",
            (data.quantity, data.deal_id),
        )
        updated_deal = dict(cur.fetchone())
        new_qty = updated_deal["current_quantity"]
        target = updated_deal["target_quantity"]

        # Mark Successful only once: when status is still Active and target just hit
        if updated_deal["status"] == "Active" and new_qty >= target:
            cur.execute(
                "UPDATE deals SET status = 'Successful' WHERE id = %s AND status = 'Active'",
                (data.deal_id,),
            )

        # Create Stripe PaymentIntent AFTER the DB row is safely locked & inserted
        payment = create_payment_intent(order_id, total_amount)
        client_secret = payment.get("client_secret")
        intent_id = payment.get("payment_intent_id")

        cur.execute(
            "UPDATE orders SET stripe_payment_intent_id = %s, stripe_client_secret = %s WHERE id = %s",
            (intent_id, client_secret, order_id),
        )
        order["stripe_payment_intent_id"] = intent_id
        order["stripe_client_secret"] = client_secret

        cur.execute("SELECT title FROM products WHERE id = %s", (deal["product_id"],))
        product_row = cur.fetchone()
        product_title = product_row["title"] if product_row else "a product"

        progress_pct = round((new_qty / target) * 100, 1) if target > 0 else 0
        create_notification(
            conn,
            user_id=deal["seller_id"],
            title="New Order Placed",
            message=f"A new order of {data.quantity} unit(s) was placed on your deal for \"{product_title}\". "
                    f"Progress: {new_qty}/{target} ({progress_pct}%).",
            notif_type="Order",
            deal_id=data.deal_id,
        )

        if new_qty >= target and updated_deal["status"] == "Active":
            create_notification(
                conn,
                user_id=deal["seller_id"],
                title="🎉 Deal Target Reached!",
                message=f"Your deal for \"{product_title}\" has reached its target of {target} units. "
                        f"Payments will be captured automatically.",
                notif_type="Deal",
                deal_id=data.deal_id,
            )

        conn.commit()
        return format_order(order)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")
    finally:
        conn.autocommit = True
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


def supplier_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can perform this action")
    return payload


@router.get("/supplier-orders")
def get_supplier_orders(
    user=Depends(supplier_only),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    payment_status: Optional[str] = Query(None),
    deal_status: Optional[str] = Query(None),
    delivery_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        seller_id = int(user["sub"])

        conditions = ["d.seller_id = %s"]
        params: list = [seller_id]

        if payment_status and payment_status != "All":
            conditions.append("o.payment_status = %s")
            params.append(payment_status)
        if deal_status and deal_status != "All":
            conditions.append("d.status = %s")
            params.append(deal_status)
        if delivery_status and delivery_status != "All":
            conditions.append("COALESCE(o.delivery_status, 'Pending') = %s")
            params.append(delivery_status)
        if search and search.strip():
            q = f"%{search.strip().lower()}%"
            conditions.append(
                "(LOWER(p.title) LIKE %s OR LOWER(u.name) LIKE %s OR LOWER(u.email) LIKE %s"
                " OR LOWER(o.order_number) LIKE %s OR LOWER(o.mobile_number) LIKE %s)"
            )
            params.extend([q, q, q, q, q])

        where = " AND ".join(conditions)

        cur.execute(f"SELECT COUNT(*) AS total FROM orders o JOIN deals d ON o.deal_id = d.id JOIN products p ON d.product_id = p.id JOIN users u ON o.user_id = u.id WHERE {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT o.id, o.order_number, o.quantity, o.total_amount, o.payment_status,
                   o.created_at, o.paid_at, o.refund_status, o.deal_id,
                   o.delivery_address, o.mobile_number, o.delivery_status,
                   d.status as deal_status, d.end_time, d.target_quantity, d.current_quantity,
                   d.price_per_unit,
                   p.title as product_title, p.image as product_image, p.brand as product_brand,
                   p.unit as product_unit,
                   u.name as buyer_name, u.email as buyer_email, u.image as buyer_image
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE {where}
            ORDER BY o.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            for amt in ["total_amount", "price_per_unit", "refund_amount"]:
                if d.get(amt) is not None:
                    d[amt] = float(d[amt])
            for ts in ["created_at", "end_time", "paid_at", "refund_time"]:
                if d.get(ts):
                    d[ts] = d[ts].isoformat()
            items.append(d)

        stats = None
        if offset == 0:
            cur.execute(f"""
                SELECT
                    COUNT(*) FILTER (WHERE o.payment_status = 'Authorized') AS authorized,
                    COUNT(*) FILTER (WHERE o.payment_status = 'Captured') AS captured,
                    COUNT(*) FILTER (WHERE COALESCE(o.delivery_status,'Pending') = 'Delivered') AS delivered,
                    COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'Captured'), 0) AS revenue
                FROM orders o
                JOIN deals d ON o.deal_id = d.id
                JOIN products p ON d.product_id = p.id
                JOIN users u ON o.user_id = u.id
                WHERE d.seller_id = %s
            """, (seller_id,))
            row = cur.fetchone()
            stats = {
                "authorized": row["authorized"],
                "captured": row["captured"],
                "delivered": row["delivered"],
                "revenue": float(row["revenue"]),
            }
            cur.execute("SELECT COUNT(*) AS total_all FROM orders o JOIN deals d ON o.deal_id = d.id WHERE d.seller_id = %s", (seller_id,))
            stats["total_all"] = cur.fetchone()["total_all"]

        return {"items": items, "total": total, "has_more": offset + len(items) < total, "stats": stats}
    finally:
        cur.close()
        conn.close()


@router.post("/{order_id}/supplier-cancel")
def supplier_cancel_order(order_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.*, d.seller_id, d.product_id, u.name as buyer_name
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            JOIN users u ON o.user_id = u.id
            WHERE o.id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order = dict(order)
        if order["seller_id"] != int(user["sub"]):
            raise HTTPException(status_code=403, detail="Access denied")
        if order["payment_status"] == "Cancelled":
            raise HTTPException(status_code=400, detail="Order is already cancelled")
        if order["payment_status"] == "Captured":
            raise HTTPException(status_code=400, detail="Cannot cancel a captured order — issue a refund instead")

        if order["payment_status"] == "Authorized" and order.get("stripe_payment_intent_id"):
            cancel_payment(order["stripe_payment_intent_id"])

        cur.execute(
            "UPDATE orders SET payment_status = 'Cancelled' WHERE id = %s",
            (order_id,)
        )

        cur.execute("UPDATE deals SET current_quantity = GREATEST(current_quantity - %s, 0) WHERE id = %s",
                    (order["quantity"], order["deal_id"]))

        try:
            cur.execute("SELECT title FROM products WHERE id = %s", (order["product_id"],))
            prod = cur.fetchone()
            title = prod["title"] if prod else "a deal"
            cur.execute(
                """INSERT INTO notifications (user_id, title, message, type, deal_id)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    order["user_id"],
                    "Order Cancelled by Supplier",
                    f'Your order for "{title}" (Order #{order.get("order_number", order_id)}) has been cancelled by the supplier.'
                    f' Any payment authorization has been released.',
                    "Order",
                    order["deal_id"],
                )
            )
        except Exception:
            pass

        conn.commit()
        return {"message": "Order cancelled successfully"}
    finally:
        cur.close()
        conn.close()


@router.post("/{order_id}/mark-delivered")
def mark_order_delivered(order_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.*, d.seller_id, d.product_id
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            WHERE o.id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order = dict(order)
        if order["seller_id"] != int(user["sub"]):
            raise HTTPException(status_code=403, detail="Access denied")
        if order["payment_status"] == "Cancelled":
            raise HTTPException(status_code=400, detail="Cannot mark a cancelled order as delivered")

        cur.execute(
            "UPDATE orders SET delivery_status = 'Delivered' WHERE id = %s",
            (order_id,)
        )

        try:
            cur.execute("SELECT title FROM products WHERE id = %s", (order["product_id"],))
            prod = cur.fetchone()
            title = prod["title"] if prod else "a deal"
            cur.execute(
                """INSERT INTO notifications (user_id, title, message, type, deal_id)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    order["user_id"],
                    "📦 Order Delivered!",
                    f'Your order for "{title}" (Order #{order.get("order_number", order_id)}) has been marked as delivered by the supplier.',
                    "Order",
                    order["deal_id"],
                )
            )
        except Exception:
            pass

        conn.commit()
        return {"message": "Order marked as delivered"}
    finally:
        cur.close()
        conn.close()


class DeliveryStatusUpdate(BaseModel):
    delivery_status: str


@router.patch("/{order_id}/delivery-status")
def update_delivery_status(order_id: int, data: DeliveryStatusUpdate, user=Depends(supplier_only)):
    """Update delivery status of an order (supplier only)."""
    allowed = {"Pending", "Shipped", "Delivered"}
    if data.delivery_status not in allowed:
        raise HTTPException(status_code=400, detail=f"delivery_status must be one of: {', '.join(allowed)}")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.*, d.seller_id, d.product_id
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            WHERE o.id = %s
        """, (order_id,))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order = dict(order)
        if order["seller_id"] != int(user["sub"]):
            raise HTTPException(status_code=403, detail="Access denied")

        cur.execute(
            "UPDATE orders SET delivery_status = %s WHERE id = %s",
            (data.delivery_status, order_id)
        )

        try:
            cur.execute("SELECT title FROM products WHERE id = %s", (order["product_id"],))
            prod = cur.fetchone()
            title = prod["title"] if prod else "your deal"
            status_labels = {
                "Shipped": ("🚚 Order Shipped!", f'Your order for "{title}" (#{order.get("order_number", order_id)}) has been shipped and is on its way.'),
                "Delivered": ("📦 Order Delivered!", f'Your order for "{title}" (#{order.get("order_number", order_id)}) has been delivered. Enjoy!'),
            }
            if data.delivery_status in status_labels:
                notif_title, notif_msg = status_labels[data.delivery_status]
                create_notification(conn, order["user_id"], notif_title, notif_msg, "Order", order["deal_id"])

                try:
                    from backend.services.push_service import send_push, get_user_tokens
                    tokens = get_user_tokens(conn, order["user_id"])
                    if tokens:
                        send_push(tokens, notif_title, notif_msg, {"type": "order", "order_id": order_id})
                except Exception:
                    pass
        except Exception:
            pass

        conn.commit()
        return {"message": f"Delivery status updated to {data.delivery_status}"}
    finally:
        cur.close()
        conn.close()


def _get_order_full(order_id: int, cur):
    """Fetch a complete order with deal, product, and buyer info."""
    cur.execute("""
        SELECT
            o.*,
            d.price_per_unit, d.actual_price, d.target_quantity, d.current_quantity,
            d.status AS deal_status, d.end_time, d.product_id, d.seller_id,
            p.title AS product_title, p.image AS product_image, p.brand AS product_brand,
            p.unit AS product_unit, p.category AS product_category,
            u.name AS buyer_name, u.email AS buyer_email, u.mobile_number AS buyer_mobile
        FROM orders o
        JOIN deals d ON o.deal_id = d.id
        JOIN products p ON d.product_id = p.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = %s
    """, (order_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return dict(row)


@router.get("/{order_id}/invoice")
def download_invoice(order_id: int, user=Depends(required_user)):
    """Download invoice PDF for an order. Consumer sees their own; supplier sees orders on their deals."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        row = _get_order_full(order_id, cur)
        uid = int(user["sub"])
        role = user.get("role")
        if role == "consumer" and row["user_id"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")
        if role == "supplier" and row["seller_id"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")

        for f in ["total_amount", "price_per_unit", "actual_price"]:
            if row.get(f) is not None:
                row[f] = float(row[f])

        order = {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in row.items()}
        deal = {
            "price_per_unit": row.get("price_per_unit"),
            "actual_price": row.get("actual_price"),
        }
        product = {
            "title": row.get("product_title"),
            "brand": row.get("product_brand"),
            "unit": row.get("product_unit"),
            "category": row.get("product_category"),
            "image": row.get("product_image"),
        }
        buyer = {
            "name": row.get("buyer_name"),
            "email": row.get("buyer_email"),
            "mobile_number": row.get("buyer_mobile"),
        }

        pdf_bytes = generate_invoice(order, deal, product, buyer)
        filename = f"Invoice_{row.get('order_number', order_id)}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        cur.close()
        conn.close()


@router.get("/{order_id}/delivery-note")
def download_delivery_note(order_id: int, user=Depends(required_user)):
    """Download delivery note PDF. Consumer or supplier of the deal."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        row = _get_order_full(order_id, cur)
        uid = int(user["sub"])
        role = user.get("role")
        if role == "consumer" and row["user_id"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")
        if role == "supplier" and row["seller_id"] != uid:
            raise HTTPException(status_code=403, detail="Access denied")

        for f in ["total_amount", "price_per_unit", "actual_price"]:
            if row.get(f) is not None:
                row[f] = float(row[f])

        order = {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in row.items()}
        end_time_raw = row.get("end_time")
        deal = {
            "price_per_unit": row.get("price_per_unit"),
            "actual_price": row.get("actual_price"),
            "end_time": end_time_raw.isoformat() if hasattr(end_time_raw, "isoformat") else end_time_raw,
        }
        product = {
            "title": row.get("product_title"),
            "brand": row.get("product_brand"),
            "unit": row.get("product_unit"),
            "category": row.get("product_category"),
        }
        buyer = {
            "name": row.get("buyer_name"),
            "email": row.get("buyer_email"),
            "mobile_number": row.get("buyer_mobile"),
        }

        pdf_bytes = generate_delivery_note(order, deal, product, buyer)
        filename = f"DeliveryNote_{row.get('order_number', order_id)}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
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
