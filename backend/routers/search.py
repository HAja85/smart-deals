from fastapi import APIRouter, Query
from backend.database import get_connection

router = APIRouter(tags=["search"])


@router.get("/search")
def search(q: str = Query("", min_length=0)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        pattern = f"%{q.lower()}%"
        cur.execute("""
            SELECT d.*, p.title as product_title, p.image as product_image,
                   p.brand as product_brand, p.unit as product_unit, p.category as product_category,
                   p.description as product_description
            FROM deals d
            JOIN products p ON d.product_id = p.id
            WHERE LOWER(p.title) LIKE %s
               OR LOWER(p.category) LIKE %s
               OR LOWER(p.brand) LIKE %s
            ORDER BY d.id DESC
        """, (pattern, pattern, pattern))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            if d.get("price_per_unit") is not None:
                d["price_per_unit"] = float(d["price_per_unit"])
            for ts in ["start_time", "end_time", "created_at"]:
                if d.get(ts):
                    d[ts] = d[ts].isoformat()
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
                "description": d.get("product_description"),
            }
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()
