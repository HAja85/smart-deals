from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection
from backend.auth import decode_token

router = APIRouter(prefix="/bids", tags=["bids"])
security = HTTPBearer(auto_error=False)


def required_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def format_bid(row: dict) -> dict:
    d = dict(row)
    d["_id"] = d["id"]
    for key in ["bid_price", "product_price"]:
        if d.get(key) is not None:
            d[key] = float(d[key])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    return d


class BidCreate(BaseModel):
    product_id: int
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_photo: Optional[str] = None
    bid_price: Optional[float] = None
    contact: Optional[str] = None
    product_image: Optional[str] = None
    product_title: Optional[str] = None
    product_price: Optional[float] = None
    status: Optional[str] = "pending"


@router.get("")
def get_bids(email: Optional[str] = Query(None), user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if email:
            cur.execute("SELECT * FROM bids WHERE buyer_email = %s ORDER BY id DESC", (email,))
        else:
            cur.execute("SELECT * FROM bids ORDER BY id DESC")
        rows = cur.fetchall()
        return [format_bid(r) for r in rows]
    finally:
        cur.close()
        conn.close()


@router.post("")
def create_bid(data: BidCreate, user=Depends(required_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO bids
               (product_id, buyer_name, buyer_email, buyer_photo, bid_price,
                contact, product_image, product_title, product_price, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (data.product_id, data.buyer_name, data.buyer_email, data.buyer_photo,
             data.bid_price, data.contact, data.product_image, data.product_title,
             data.product_price, data.status or "pending"),
        )
        row = cur.fetchone()
        conn.commit()
        result = format_bid(dict(row))
        result["insertedId"] = result["id"]
        return result
    finally:
        cur.close()
        conn.close()


@router.delete("/{bid_id}")
def delete_bid(bid_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM bids WHERE id = %s", (bid_id,))
        deleted = cur.rowcount
        conn.commit()
        return {"deletedCount": deleted}
    finally:
        cur.close()
        conn.close()
