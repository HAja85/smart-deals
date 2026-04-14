from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.auth import decode_token

router = APIRouter(prefix="/products", tags=["products"])
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


def format_product(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    for key in ["price_min", "price_max"]:
        if d.get(key) is not None:
            d[key] = float(d[key])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    return d


class ProductCreate(BaseModel):
    title: str
    category: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    condition: Optional[str] = None
    usage: Optional[str] = None
    image: Optional[str] = None
    seller_name: Optional[str] = None
    sellerEmail: Optional[str] = None
    seller_contact: Optional[str] = None
    seller_image: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    status: Optional[str] = "pending"


@router.get("")
def get_products(email: Optional[str] = Query(None), user=Depends(optional_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if email:
            cur.execute("SELECT * FROM products WHERE seller_email = %s ORDER BY id DESC", (email,))
        else:
            cur.execute("SELECT * FROM products ORDER BY id DESC")
        rows = cur.fetchall()
        return [format_product(r) for r in rows]
    finally:
        cur.close()
        conn.close()


@router.get("/latest")
def get_latest_products():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM products ORDER BY id DESC LIMIT 6")
        rows = cur.fetchall()
        return [format_product(r) for r in rows]
    finally:
        cur.close()
        conn.close()


@router.get("/bids/{product_id}")
def get_bids_for_product(product_id: int, user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM bids WHERE product_id = %s ORDER BY bid_price DESC", (product_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["_id"] = d["id"]
            for key in ["bid_price", "product_price"]:
                if d.get(key) is not None:
                    d[key] = float(d[key])
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@router.get("/{product_id}")
def get_product(product_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return format_product(dict(row))
    finally:
        cur.close()
        conn.close()


@router.post("")
def create_product(data: ProductCreate, user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        seller_email = data.sellerEmail or data.email
        cur.execute(
            """INSERT INTO products
               (title, category, price_min, price_max, condition, usage, image,
                seller_name, seller_email, seller_contact, seller_image, location, description, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.title, data.category, data.price_min, data.price_max,
             data.condition, data.usage, data.image, data.seller_name,
             seller_email, data.seller_contact, data.seller_image,
             data.location, data.description, data.status or "pending"),
        )
        row = cur.fetchone()
        conn.commit()
        result = format_product(dict(row))
        result["insertedId"] = result["id"]
        return result
    finally:
        cur.close()
        conn.close()


@router.delete("/{product_id}")
def delete_product(product_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
        deleted = cur.rowcount
        conn.commit()
        return {"deletedCount": deleted}
    finally:
        cur.close()
        conn.close()
