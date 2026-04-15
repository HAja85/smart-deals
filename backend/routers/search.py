from fastapi import APIRouter, Query
from backend.database import get_connection

router = APIRouter(tags=["search"])


@router.get("/search")
def search(
    q: str = Query("", min_length=0),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        pattern = f"%{q.lower()}%"
        count_sql = """
            SELECT COUNT(*) AS total
            FROM deals d
            JOIN products p ON d.product_id = p.id
            WHERE LOWER(p.title) LIKE %s
               OR LOWER(p.category) LIKE %s
               OR LOWER(p.brand) LIKE %s
        """
        cur.execute(count_sql, (pattern, pattern, pattern))
        total = cur.fetchone()["total"]

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
            LIMIT %s OFFSET %s
        """, (pattern, pattern, pattern, limit, offset))
        rows = cur.fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            if d.get("price_per_unit") is not None:
                d["price_per_unit"] = float(d["price_per_unit"])
            if d.get("actual_price") is not None:
                d["actual_price"] = float(d["actual_price"])
            for ts in ["start_time", "end_time", "created_at"]:
                if d.get(ts):
                    d[ts] = d[ts].isoformat()
            progress = 0
            if d.get("target_quantity") and d["target_quantity"] > 0:
                progress = round((d.get("current_quantity", 0) / d["target_quantity"]) * 100, 1)
            d["progress_percent"] = min(progress, 100)
            if d.get("actual_price") and d.get("price_per_unit") and d["actual_price"] > 0:
                d["discount_percent"] = round(((d["actual_price"] - d["price_per_unit"]) / d["actual_price"]) * 100, 1)
            else:
                d["discount_percent"] = 0
            d["product"] = {
                "title": d.get("product_title"),
                "image": d.get("product_image"),
                "brand": d.get("product_brand"),
                "unit": d.get("product_unit"),
                "category": d.get("product_category"),
                "description": d.get("product_description"),
            }
            items.append(d)
        return {"items": items, "total": total, "has_more": offset + len(items) < total}
    finally:
        cur.close()
        conn.close()
