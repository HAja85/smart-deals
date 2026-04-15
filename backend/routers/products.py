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


def supplier_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can perform this action")
    return payload


def format_product(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    return d


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None


class ProductCreate(BaseModel):
    title: str
    category: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None
    seller_name: Optional[str] = None
    seller_contact: Optional[str] = None
    seller_image: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "active"


@router.get("")
def get_products(email: Optional[str] = Query(None)):
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


@router.get("/my-products")
def get_my_products(user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM products WHERE seller_id = %s ORDER BY id DESC", (int(user["sub"]),))
        rows = cur.fetchall()
        return [format_product(r) for r in rows]
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
def create_product(data: ProductCreate, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT name, email, image FROM users WHERE id = %s", (int(user["sub"]),))
        u = cur.fetchone()
        seller_name = data.seller_name or (u["name"] if u else "")
        seller_email = user["email"]
        seller_image = data.seller_image or (u["image"] if u else "")

        cur.execute(
            """INSERT INTO products
               (title, category, description, image, brand, unit, seller_id, seller_name, seller_email,
                seller_contact, seller_image, location, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.title, data.category, data.description, data.image, data.brand, data.unit,
             int(user["sub"]), seller_name, seller_email, data.seller_contact,
             seller_image, data.location, data.status or "active"),
        )
        row = cur.fetchone()
        conn.commit()
        result = format_product(dict(row))
        result["insertedId"] = result["id"]
        return result
    finally:
        cur.close()
        conn.close()


@router.patch("/{product_id}")
def update_product(product_id: int, data: ProductUpdate, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM products WHERE id = %s AND seller_id = %s", (product_id, int(user["sub"])))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Product not found or access denied")

        updates = []
        values = []
        for field in ["title", "category", "description", "image", "brand", "unit"]:
            val = getattr(data, field)
            if val is not None:
                updates.append(f"{field} = %s")
                values.append(val)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        values.append(product_id)
        cur.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = %s RETURNING *", values)
        row = cur.fetchone()
        conn.commit()
        return format_product(dict(row))
    finally:
        cur.close()
        conn.close()


@router.delete("/{product_id}")
def delete_product(product_id: int, user=Depends(supplier_only)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM products WHERE id = %s AND seller_id = %s", (product_id, int(user["sub"])))
        deleted = cur.rowcount
        conn.commit()
        return {"deletedCount": deleted}
    finally:
        cur.close()
        conn.close()
