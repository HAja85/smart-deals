import io
from datetime import datetime, timezone, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

BRAND_BLUE = colors.HexColor("#1B4F8A")
BRAND_TEAL = colors.HexColor("#0D9488")
BRAND_AMBER = colors.HexColor("#F59E0B")
LIGHT_GRAY = colors.HexColor("#F3F4F6")
MID_GRAY = colors.HexColor("#6B7280")
DARK_GRAY = colors.HexColor("#1F2937")


def _header_footer(canvas, doc, title_label):
    canvas.saveState()
    w, h = A4

    canvas.setFillColor(BRAND_BLUE)
    canvas.rect(0, h - 50 * mm, w, 50 * mm, fill=True, stroke=False)

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 20)
    canvas.drawString(15 * mm, h - 22 * mm, "SmartDeals Kuwait")
    canvas.setFont("Helvetica", 10)
    canvas.drawString(15 * mm, h - 32 * mm, "smartdeals.kw  |  support@smartdeals.kw")

    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawRightString(w - 15 * mm, h - 22 * mm, title_label)
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(BRAND_AMBER)
    canvas.drawRightString(w - 15 * mm, h - 32 * mm,
                           datetime.now(timezone.utc).strftime("%d %b %Y"))

    canvas.setFillColor(DARK_GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(w / 2, 10 * mm,
                             f"SmartDeals Kuwait  •  Page {doc.page}  •  Generated {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M')} UTC")
    canvas.restoreState()


def _kwd(amount) -> str:
    return f"{float(amount or 0):.3f} KWD"


def generate_invoice(order: dict, deal: dict, product: dict, buyer: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=60 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle("label", fontSize=8, textColor=MID_GRAY, spaceAfter=1)
    value_style = ParagraphStyle("value", fontSize=10, textColor=DARK_GRAY, spaceAfter=4)
    h2 = ParagraphStyle("h2", fontSize=13, textColor=BRAND_BLUE, spaceBefore=6, spaceAfter=4, fontName="Helvetica-Bold")

    order_number = order.get("order_number") or f"ORD-{order.get('id', 0):06d}"
    unit_price = float(deal.get("price_per_unit") or 0)
    actual_price = float(deal.get("actual_price") or 0)
    qty = int(order.get("quantity") or 1)
    total = float(order.get("total_amount") or unit_price * qty)
    savings = max(0, (actual_price - unit_price) * qty)
    discount_pct = round(((actual_price - unit_price) / actual_price) * 100, 1) if actual_price > 0 else 0

    elements = []

    info_data = [
        [
            Paragraph(f"<b>Invoice No.</b>", label_style),
            Paragraph(f"<b>Order Date</b>", label_style),
            Paragraph(f"<b>Payment Status</b>", label_style),
        ],
        [
            Paragraph(order_number, value_style),
            Paragraph((order.get("created_at") or "")[:10], value_style),
            Paragraph(order.get("payment_status") or "Pending", value_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[(A4[0] - 30 * mm) / 3] * 3)
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph("Bill To", h2))
    buyer_data = [
        [Paragraph("Name", label_style), Paragraph(buyer.get("name") or "—", value_style)],
        [Paragraph("Email", label_style), Paragraph(buyer.get("email") or "—", value_style)],
        [Paragraph("Mobile", label_style), Paragraph(order.get("mobile_number") or buyer.get("mobile_number") or "—", value_style)],
        [Paragraph("Delivery Address", label_style), Paragraph(order.get("delivery_address") or "—", value_style)],
    ]
    buyer_table = Table(buyer_data, colWidths=[40 * mm, (A4[0] - 70 * mm)])
    buyer_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(buyer_table)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph("Order Details", h2))
    line_data = [
        ["Product", "Category", "Unit", "Retail Price", "Deal Price", "Qty", "Line Total"],
        [
            product.get("title") or "—",
            product.get("category") or "—",
            product.get("unit") or "—",
            _kwd(actual_price),
            _kwd(unit_price),
            str(qty),
            _kwd(unit_price * qty),
        ],
    ]
    col_widths = [55 * mm, 30 * mm, 25 * mm, 25 * mm, 25 * mm, 12 * mm, 28 * mm]
    line_table = Table(line_data, colWidths=col_widths)
    line_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 4 * mm))

    summary_data = [
        ["Subtotal (Retail)", _kwd(actual_price * qty)],
        [f"Group Discount ({discount_pct}%)", f"- {_kwd(savings)}"],
        ["", ""],
        ["TOTAL DUE", _kwd(total)],
    ]
    summary_table = Table(summary_data, colWidths=[A4[0] - 30 * mm - 50 * mm, 50 * mm],
                          hAlign="RIGHT")
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (1, 1), (1, 1), BRAND_TEAL),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("FONTSIZE", (0, 3), (-1, 3), 11),
        ("TEXTCOLOR", (0, 3), (-1, 3), BRAND_BLUE),
        ("LINEABOVE", (0, 3), (-1, 3), 1, BRAND_BLUE),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 2), (-1, 2), 0),
        ("BOTTOMPADDING", (0, 2), (-1, 2), 0),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        "Thank you for shopping with SmartDeals Kuwait! "
        "For support, contact support@smartdeals.kw.",
        ParagraphStyle("footer", fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER)
    ))

    doc.build(elements, onFirstPage=lambda c, d: _header_footer(c, d, "INVOICE"),
              onLaterPages=lambda c, d: _header_footer(c, d, "INVOICE"))
    return buffer.getvalue()


def generate_delivery_note(order: dict, deal: dict, product: dict, buyer: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=60 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle("label", fontSize=8, textColor=MID_GRAY, spaceAfter=1)
    value_style = ParagraphStyle("value", fontSize=10, textColor=DARK_GRAY, spaceAfter=4)
    h2 = ParagraphStyle("h2", fontSize=13, textColor=BRAND_BLUE, spaceBefore=6, spaceAfter=4, fontName="Helvetica-Bold")
    big = ParagraphStyle("big", fontSize=28, textColor=BRAND_BLUE, fontName="Helvetica-Bold",
                         alignment=TA_CENTER, spaceBefore=4, spaceAfter=4)

    order_number = order.get("order_number") or f"ORD-{order.get('id', 0):06d}"
    qty = int(order.get("quantity") or 1)

    est_delivery_date = "—"
    try:
        base_date = None
        if deal.get("end_time"):
            raw = deal["end_time"]
            if isinstance(raw, str):
                base_date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            elif isinstance(raw, datetime):
                base_date = raw
        if base_date is None and order.get("created_at"):
            raw = order["created_at"]
            if isinstance(raw, str):
                base_date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            elif isinstance(raw, datetime):
                base_date = raw
        if base_date is not None:
            if base_date.tzinfo is None:
                base_date = base_date.replace(tzinfo=timezone.utc)
            from_date = max(base_date, datetime.now(timezone.utc))
            est = from_date + timedelta(days=5)
            est_delivery_date = est.strftime("%d %b %Y")
    except Exception:
        pass

    elements = []
    elements.append(Paragraph(order_number, big))
    elements.append(HRFlowable(width="100%", thickness=2, color=BRAND_AMBER))
    elements.append(Spacer(1, 4 * mm))

    elements.append(Paragraph("Deliver To", h2))
    recipient_data = [
        [Paragraph("Name", label_style), Paragraph(buyer.get("name") or "—", value_style)],
        [Paragraph("Mobile", label_style), Paragraph(order.get("mobile_number") or buyer.get("mobile_number") or "—", value_style)],
        [Paragraph("Address", label_style), Paragraph(order.get("delivery_address") or "—", value_style)],
        [Paragraph("Est. Delivery", label_style), Paragraph(est_delivery_date, value_style)],
    ]
    rt = Table(recipient_data, colWidths=[35 * mm, A4[0] - 65 * mm])
    rt.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_GRAY),
    ]))
    elements.append(rt)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph("Item(s)", h2))
    item_data = [
        ["Product", "Brand", "Unit", "Qty Ordered"],
        [
            product.get("title") or "—",
            product.get("brand") or "—",
            product.get("unit") or "—",
            str(qty),
        ],
    ]
    it = Table(item_data, colWidths=[80 * mm, 40 * mm, 40 * mm, 20 * mm])
    it.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
    ]))
    elements.append(it)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph("Notes", h2))
    elements.append(Paragraph(
        "Please inspect items upon receipt. For any issues contact support@smartdeals.kw "
        "or call your supplier directly.",
        ParagraphStyle("note", fontSize=9, textColor=MID_GRAY)
    ))
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY))
    elements.append(Spacer(1, 3 * mm))

    sig_data = [
        ["Supplier Signature:", "Recipient Signature:", "Date:"],
        ["\n\n_______________________", "\n\n_______________________", "\n\n_______________________"],
    ]
    st = Table(sig_data, colWidths=[(A4[0] - 30 * mm) / 3] * 3)
    st.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), MID_GRAY),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(st)

    doc.build(elements, onFirstPage=lambda c, d: _header_footer(c, d, "DELIVERY NOTE"),
              onLaterPages=lambda c, d: _header_footer(c, d, "DELIVERY NOTE"))
    return buffer.getvalue()


def generate_accounting_report(supplier: dict, orders: list, from_date: str, to_date: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=60 * mm,
        bottomMargin=20 * mm,
    )

    label_style = ParagraphStyle("label", fontSize=8, textColor=MID_GRAY, spaceAfter=1)
    value_style = ParagraphStyle("value", fontSize=10, textColor=DARK_GRAY, spaceAfter=4)
    h2 = ParagraphStyle("h2", fontSize=13, textColor=BRAND_BLUE, spaceBefore=6, spaceAfter=4, fontName="Helvetica-Bold")

    elements = []

    period_str = f"{from_date}  →  {to_date}"
    meta = [
        [Paragraph("Supplier", label_style), Paragraph(supplier.get("name") or "—", value_style),
         Paragraph("Period", label_style), Paragraph(period_str, value_style)],
        [Paragraph("Email", label_style), Paragraph(supplier.get("email") or "—", value_style),
         Paragraph("Generated", label_style),
         Paragraph(datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC"), value_style)],
    ]
    mt = Table(meta, colWidths=[30 * mm, 65 * mm, 25 * mm, 60 * mm])
    mt.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
    ]))
    elements.append(mt)
    elements.append(Spacer(1, 5 * mm))

    deal_map: dict = {}
    for o in orders:
        did = o.get("deal_id") or o.get("id")
        key = (did, o.get("product_title") or "Unknown", o.get("price_per_unit") or 0, o.get("actual_price") or 0)
        if key not in deal_map:
            deal_map[key] = {"units": 0, "revenue": 0.0}
        deal_map[key]["units"] += int(o.get("quantity") or 0)
        deal_map[key]["revenue"] += float(o.get("total_amount") or 0)

    total_revenue = sum(v["revenue"] for v in deal_map.values())
    total_units = sum(v["units"] for v in deal_map.values())
    total_retail = sum(
        float(k[3]) * v["units"] for k, v in deal_map.items()
    )
    total_savings = max(0, total_retail - total_revenue)

    kpi_data = [
        [
            Paragraph("Total Orders", label_style),
            Paragraph("Total Units", label_style),
            Paragraph("Gross Revenue (KWD)", label_style),
            Paragraph("Consumer Savings (KWD)", label_style),
        ],
        [
            Paragraph(str(len(orders)), ParagraphStyle("kpi", fontSize=18, textColor=BRAND_BLUE, fontName="Helvetica-Bold")),
            Paragraph(str(total_units), ParagraphStyle("kpi", fontSize=18, textColor=BRAND_BLUE, fontName="Helvetica-Bold")),
            Paragraph(f"{total_revenue:.3f}", ParagraphStyle("kpi", fontSize=18, textColor=BRAND_TEAL, fontName="Helvetica-Bold")),
            Paragraph(f"{total_savings:.3f}", ParagraphStyle("kpi", fontSize=18, textColor=BRAND_AMBER, fontName="Helvetica-Bold")),
        ]
    ]
    kpi_t = Table(kpi_data, colWidths=[(A4[0] - 30 * mm) / 4] * 4)
    kpi_t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
    ]))
    elements.append(kpi_t)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph("Deal-by-Deal Breakdown", h2))

    header = ["Product", "Deal Price", "Retail Price", "Units Sold", "Revenue (KWD)", "Retail Value", "Margin %"]
    rows_data = [header]
    for (did, title, deal_price, retail_price), stats in sorted(deal_map.items(), key=lambda x: -x[1]["revenue"]):
        rev = stats["revenue"]
        units = stats["units"]
        retail_val = float(retail_price) * units
        margin = round(((retail_val - rev) / retail_val) * 100, 1) if retail_val > 0 else 0
        rows_data.append([
            title[:35] + ("…" if len(title) > 35 else ""),
            _kwd(deal_price),
            _kwd(retail_price),
            str(units),
            f"{rev:.3f}",
            f"{retail_val:.3f}",
            f"{margin}%",
        ])

    rows_data.append([
        "TOTAL", "", "", str(total_units),
        f"{total_revenue:.3f}", f"{total_retail:.3f}",
        f"{round(((total_retail - total_revenue) / total_retail) * 100, 1) if total_retail > 0 else 0}%"
    ])

    col_w = [55 * mm, 22 * mm, 22 * mm, 15 * mm, 25 * mm, 25 * mm, 16 * mm]
    dt = Table(rows_data, colWidths=col_w)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, LIGHT_GRAY]),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND_BLUE),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]
    dt.setStyle(TableStyle(style))
    elements.append(dt)

    doc.build(elements,
              onFirstPage=lambda c, d: _header_footer(c, d, "ACCOUNTING REPORT"),
              onLaterPages=lambda c, d: _header_footer(c, d, "ACCOUNTING REPORT"))
    return buffer.getvalue()
