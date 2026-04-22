from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from backend.database import get_connection
from backend.auth import decode_token
from backend.services.pdf_service import generate_accounting_report
from datetime import datetime, timezone

router = APIRouter(prefix="/reports", tags=["reports"])
security = HTTPBearer()


def supplier_only(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "supplier":
        raise HTTPException(status_code=403, detail="Suppliers only")
    return payload


@router.get("/supplier")
def supplier_accounting_report(
    from_date: str = Query(..., alias="from", description="Start date YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="End date YYYY-MM-DD"),
    user=Depends(supplier_only),
):
    """Generate and return a PDF accounting report for the supplier over a date range.
    
    Usage: GET /api/reports/supplier?from=2025-01-01&to=2025-12-31
    """
    try:
        from_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        to_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=timezone.utc
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if from_dt > to_dt:
        raise HTTPException(status_code=400, detail="from must be before to")

    conn = get_connection()
    cur = conn.cursor()
    try:
        seller_id = int(user["sub"])

        cur.execute("SELECT id, name, email FROM users WHERE id = %s", (seller_id,))
        supplier_row = cur.fetchone()
        if not supplier_row:
            raise HTTPException(status_code=404, detail="Supplier not found")
        supplier = dict(supplier_row)

        cur.execute("""
            SELECT
                o.id, o.deal_id, o.quantity, o.total_amount, o.payment_status,
                o.created_at, o.order_number, o.delivery_status,
                d.price_per_unit, d.actual_price,
                p.title AS product_title, p.category AS product_category,
                p.brand AS product_brand
            FROM orders o
            JOIN deals d ON o.deal_id = d.id
            JOIN products p ON d.product_id = p.id
            WHERE d.seller_id = %s
              AND o.created_at >= %s
              AND o.created_at <= %s
              AND o.payment_status IN ('Paid', 'Captured')
            ORDER BY o.created_at DESC
        """, (seller_id, from_dt, to_dt))
        orders = [dict(r) for r in cur.fetchall()]

        for o in orders:
            for f in ["total_amount", "price_per_unit", "actual_price"]:
                if o.get(f) is not None:
                    o[f] = float(o[f])

        pdf_bytes = generate_accounting_report(supplier, orders, from_date, to_date)
        filename = f"SmartDeals_Report_{from_date}_{to_date}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        cur.close()
        conn.close()
