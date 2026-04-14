from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.database import get_connection
from backend.auth import decode_token

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
    if d.get("price_per_unit") is not None:
        d["price_per_unit"] = float(d["price_per_unit"])
    for ts in ["start_time", "end_time", "created_at"]:
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    return d


class DealCreate(BaseModel):
    product_id: int
    target_quantity: int
    price_per_unit: float
    end_time: str


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


@router.get("")
def get_deals(status: Optional[str] = Query(None)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if status:
            cur.execute("SELECT * FROM deals WHERE status = %s ORDER BY id DESC", (status,))
        else:
            cur.execute("SELECT * FROM deals ORDER BY id DESC")
        rows = cur.fetchall()
        return [get_deal_with_product(cur, dict(r)) for r in rows]
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

        try:
            end_time = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid end_time format")

        cur.execute(
            """INSERT INTO deals (product_id, seller_id, target_quantity, price_per_unit, end_time)
               VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (data.product_id, int(user["sub"]), data.target_quantity, data.price_per_unit, end_time),
        )
        row = cur.fetchone()
        conn.commit()
        return get_deal_with_product(cur, dict(row))
    finally:
        cur.close()
        conn.close()
