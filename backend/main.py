import os
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import init_db, seed_db, seed_demo_data, get_connection
from backend.routers import auth_router, products, deals, orders, search, notifications, admin
from backend.routers import cart, push, reports
from backend.routers.notifications import create_notification
from backend.services import payment_service
from backend.services.push_service import send_push, get_users_tokens
from datetime import datetime, timezone, timedelta

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5

app = FastAPI(title="SmartDeals Kuwait API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_deal_statuses():
    try:
        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now(timezone.utc)

        cur.execute("SELECT * FROM deals WHERE status = 'Upcoming'")
        upcoming_deals = cur.fetchall()
        for deal in upcoming_deals:
            deal = dict(deal)
            start_time = deal["start_time"]
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            if now >= start_time:
                cur.execute("UPDATE deals SET status = 'Active' WHERE id = %s", (deal["id"],))

        cur.execute("SELECT * FROM deals WHERE status = 'Active'")
        active_deals = cur.fetchall()
        for deal in active_deals:
            deal = dict(deal)
            end_time = deal["end_time"]
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)

            cur.execute("SELECT title FROM products WHERE id = %s", (deal["product_id"],))
            prod = cur.fetchone()
            product_title = prod["title"] if prod else "a product"

            time_left = end_time - now
            if timedelta(minutes=55) < time_left <= timedelta(hours=1):
                cur.execute(
                    "SELECT 1 FROM notifications WHERE deal_id = %s AND type = 'Expiry' AND created_at > NOW() - INTERVAL '2 hours'",
                    (deal["id"],)
                )
                if not cur.fetchone():
                    create_notification(
                        conn,
                        user_id=deal["seller_id"],
                        title="⏰ Deal Expiring Soon",
                        message=f"Your deal for \"{product_title}\" expires in about 1 hour. "
                                f"Current progress: {deal['current_quantity']}/{deal['target_quantity']} units.",
                        notif_type="Expiry",
                        deal_id=deal["id"],
                    )

            target = deal["target_quantity"]
            current = deal["current_quantity"]
            if target > 0 and current > 0:
                pct = (current / target) * 100
                if 78 <= pct < 82:
                    cur.execute(
                        "SELECT 1 FROM notifications WHERE deal_id = %s AND type = 'Quantity' AND created_at > NOW() - INTERVAL '3 hours'",
                        (deal["id"],)
                    )
                    if not cur.fetchone():
                        create_notification(
                            conn,
                            user_id=deal["seller_id"],
                            title="📦 Almost There! 80% Reached",
                            message=f"Your deal for \"{product_title}\" is at {current}/{target} units ({round(pct, 1)}%). "
                                    f"Just {target - current} more unit(s) to hit the target!",
                            notif_type="Quantity",
                            deal_id=deal["id"],
                        )

            if now >= end_time:
                if deal["current_quantity"] >= deal["target_quantity"]:
                    cur.execute("UPDATE deals SET status = 'Successful' WHERE id = %s", (deal["id"],))
                    cur.execute(
                        "SELECT id, stripe_payment_intent_id, user_id FROM orders WHERE deal_id = %s AND payment_status = 'Authorized'",
                        (deal["id"],)
                    )
                    affected_orders = cur.fetchall()
                    for order in affected_orders:
                        order = dict(order)
                        if order.get("stripe_payment_intent_id"):
                            payment_service.capture_payment(order["stripe_payment_intent_id"])
                    cur.execute(
                        "UPDATE orders SET payment_status = 'Captured', paid_at = NOW() WHERE deal_id = %s AND payment_status = 'Authorized'",
                        (deal["id"],)
                    )
                    create_notification(
                        conn,
                        user_id=deal["seller_id"],
                        title="✅ Deal Successful!",
                        message=f"Your deal for \"{product_title}\" has ended successfully with {deal['current_quantity']} units. "
                                f"All payments have been captured.",
                        notif_type="Deal",
                        deal_id=deal["id"],
                    )
                    try:
                        consumer_ids = [dict(o)["user_id"] for o in affected_orders if dict(o).get("user_id")]
                        tokens = get_users_tokens(conn, consumer_ids)
                        send_push(tokens, "🎉 Your Group Deal Succeeded!",
                                  f'"{product_title}" reached its target. Payment captured!',
                                  {"type": "deal", "deal_id": deal["id"]})
                        supplier_tokens = get_users_tokens(conn, [deal["seller_id"]])
                        send_push(supplier_tokens, "✅ Deal Successful!", f'"{product_title}" reached its target.',
                                  {"type": "deal", "deal_id": deal["id"]})
                    except Exception:
                        pass
                    cur.execute("DELETE FROM cart_items WHERE deal_id = %s", (deal["id"],))
                else:
                    cur.execute("UPDATE deals SET status = 'Failed' WHERE id = %s", (deal["id"],))
                    cur.execute(
                        "SELECT id, stripe_payment_intent_id, user_id FROM orders WHERE deal_id = %s AND payment_status IN ('Pending', 'Authorized')",
                        (deal["id"],)
                    )
                    failed_orders = cur.fetchall()
                    for order in failed_orders:
                        order = dict(order)
                        if order.get("stripe_payment_intent_id"):
                            payment_service.cancel_payment(order["stripe_payment_intent_id"])
                    cur.execute(
                        "UPDATE orders SET payment_status = 'Cancelled' WHERE deal_id = %s AND payment_status IN ('Pending', 'Authorized')",
                        (deal["id"],)
                    )
                    create_notification(
                        conn,
                        user_id=deal["seller_id"],
                        title="❌ Deal Failed",
                        message=f"Your deal for \"{product_title}\" expired without reaching the target. "
                                f"Only {deal['current_quantity']}/{deal['target_quantity']} units were ordered. "
                                f"All pending payments have been cancelled.",
                        notif_type="Deal",
                        deal_id=deal["id"],
                    )
                    try:
                        consumer_ids = [dict(o)["user_id"] for o in failed_orders if dict(o).get("user_id")]
                        tokens = get_users_tokens(conn, consumer_ids)
                        send_push(tokens, "❌ Deal Expired",
                                  f'"{product_title}" didn\'t reach its target. No charge was made.',
                                  {"type": "deal", "deal_id": deal["id"]})
                        supplier_tokens = get_users_tokens(conn, [deal["seller_id"]])
                        send_push(supplier_tokens, "❌ Deal Failed", f'"{product_title}" expired without reaching the target.',
                                  {"type": "deal", "deal_id": deal["id"]})
                    except Exception:
                        pass
                    cur.execute("DELETE FROM cart_items WHERE deal_id = %s", (deal["id"],))

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Scheduler error: {e}")


scheduler = BackgroundScheduler()
scheduler.add_job(check_deal_statuses, "interval", minutes=1)


@app.on_event("startup")
def startup():
    init_db()
    seed_db()
    seed_demo_data()
    scheduler.start()
    print("Deal status scheduler started")


@app.on_event("shutdown")
def shutdown():
    scheduler.shutdown()


app.include_router(auth_router.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(deals.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(push.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, or GIF images are allowed.")
    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File must be smaller than {MAX_SIZE_MB} MB.")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/{filename}", "filename": filename}


def _format_deal_row(r, cur):
    d = dict(r)
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
    progress = 0
    if d.get("target_quantity") and d["target_quantity"] > 0:
        progress = round((d.get("current_quantity", 0) / d["target_quantity"]) * 100, 1)
    d["progress_percent"] = min(progress, 100)
    d["product"] = {
        "title": d.get("product_title"),
        "image": d.get("product_image"),
        "brand": d.get("product_brand"),
        "unit": d.get("product_unit"),
        "category": d.get("product_category"),
    }
    return d


@app.get("/api/latest-deals")
def latest_deals():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT d.*, p.title as product_title, p.image as product_image,
                   p.brand as product_brand, p.unit as product_unit, p.category as product_category
            FROM deals d
            JOIN products p ON d.product_id = p.id
            WHERE d.status = 'Active'
            ORDER BY d.id DESC LIMIT 6
        """)
        return [_format_deal_row(r, cur) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@app.get("/api/upcoming-deals")
def upcoming_deals():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT d.*, p.title as product_title, p.image as product_image,
                   p.brand as product_brand, p.unit as product_unit, p.category as product_category
            FROM deals d
            JOIN products p ON d.product_id = p.id
            WHERE d.status = 'Upcoming'
            ORDER BY d.start_time ASC LIMIT 6
        """)
        return [_format_deal_row(r, cur) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@app.get("/api/config")
def get_config():
    return {"stripe_publishable_key": os.environ.get("STRIPE_PUBLISHABLE_KEY", "")}


@app.get("/api/health")
def health():
    return {"status": "ok"}


DIST_DIR = "dist"

@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    file_path = os.path.join(DIST_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"detail": "Frontend not built. Run: npm run build"}
