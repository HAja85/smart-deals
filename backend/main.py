from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routers import auth_router, products, bids

app = FastAPI(title="Smart Deals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


app.include_router(auth_router.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(bids.router, prefix="/api")


@app.get("/api/latest-product")
def latest_products():
    from backend.database import get_connection
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM products ORDER BY id DESC LIMIT 6")
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            for key in ["price_min", "price_max"]:
                if d.get(key) is not None:
                    d[key] = float(d[key])
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
