from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import init_db, get_connection
from backend.routers import auth_router, products, deals, orders, search
from datetime import datetime, timezone

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
            if now >= end_time:
                if deal["current_quantity"] >= deal["target_quantity"]:
                    cur.execute("UPDATE deals SET status = 'Successful' WHERE id = %s", (deal["id"],))
                    cur.execute("UPDATE orders SET payment_status = 'Captured' WHERE deal_id = %s", (deal["id"],))
                else:
                    cur.execute("UPDATE deals SET status = 'Failed' WHERE id = %s", (deal["id"],))
                    cur.execute("UPDATE orders SET payment_status = 'Cancelled' WHERE deal_id = %s", (deal["id"],))

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


@app.get("/api/health")
def health():
    return {"status": "ok"}
