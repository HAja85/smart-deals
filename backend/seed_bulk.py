"""
Bulk seeder: creates 300 consumers, 1020 deals, and 50-80 orders per deal.
Run with:  python3 -m backend.seed_bulk
"""
import random
import hashlib
from datetime import datetime, timezone, timedelta
from psycopg2.extras import execute_values
from backend.database import get_connection, init_db

# ── Kuwait locale data ────────────────────────────────────────────────────────

AREAS = [
    "Salmiya", "Hawalli", "Salwa", "Rumaithiya", "Bayan", "Mishref", "Jabriya",
    "Surra", "Shuwaikh", "Farwaniya", "Khaitan", "Ardiya", "Fahaheel", "Mahboula",
    "Mangaf", "Fintas", "Sabah Al Salem", "Bneid Al Qar", "Dasman", "Dasma",
    "Nuzha", "Rawda", "Shamiya", "Yarmouk", "Qadisiya", "Kaifan", "Rigga",
    "Abu Halifa", "Sabah Al Ahmad", "South Surra", "West Abu Fatira",
]

FIRST_NAMES = [
    "Ahmed", "Mohammed", "Fatima", "Maryam", "Abdullah", "Khaled", "Sara",
    "Noura", "Ali", "Hassan", "Layla", "Hessa", "Yousef", "Ibrahim", "Aisha",
    "Reem", "Omar", "Tariq", "Dalal", "Shaikha", "Bader", "Jassim", "Wafa",
    "Nadia", "Hamad", "Saud", "Manal", "Ghada", "Waleed", "Nawaf", "Dina",
    "Lulwa", "Mishari", "Asma", "Turki", "Hana", "Faisal", "Amira", "Nasser",
    "Rana", "Salman", "Haya", "Jasem", "Shahad", "Rashid", "Mona", "Zaid",
    "Ruba", "Saad", "Fajer",
]

LAST_NAMES = [
    "Al-Rashidi", "Al-Azmi", "Al-Sabah", "Al-Ahmad", "Al-Mutairi", "Al-Enezi",
    "Al-Hajri", "Al-Shimmari", "Al-Harbi", "Al-Dosari", "Al-Kandari", "Al-Failakawi",
    "Al-Hajeri", "Al-Rushaid", "Al-Adwani", "Al-Mulla", "Al-Saleh", "Al-Hamad",
    "Al-Qattan", "Al-Baghli", "Al-Fulaij", "Al-Sarraf", "Al-Zabin", "Al-Blushi",
    "Al-Rumi", "Al-Dabbous", "Al-Sayer", "Al-Wazzan", "Al-Ghanim", "Al-Bisher",
]

STREET_NAMES = [
    "Gulf Road", "Fahaheel Expressway", "Fifth Ring Road", "Fourth Ring Road",
    "Bayan Street", "Jabriya Street", "Salmiya Corniche", "Salem Al Mubarak Street",
    "Al Qurain Avenue", "Mishref Boulevard", "Airport Road", "King Fahad Road",
    "Mubarak Al Kabeer Street", "Al Shaheed Park Road", "Marina Crescent Drive",
]

PAYMENT_STATUSES_ACTIVE    = ["Pending", "Authorized"]
PAYMENT_STATUSES_SUCCESSFUL = ["Captured"]
PAYMENT_STATUSES_FAILED     = ["Cancelled", "Pending"]
PAYMENT_STATUSES_STOPPED    = ["Cancelled", "Pending"]

DELIVERY_STATUSES_CAPTURED  = ["Pending", "Delivered"]
DELIVERY_STATUS_OTHER       = "Pending"


def fake_password_hash(email: str) -> str:
    return "hashed_" + hashlib.md5(email.encode()).hexdigest()


def random_mobile() -> str:
    prefix = random.choice(["9", "6", "5"])
    return f"+965 {prefix}{random.randint(1000000, 9999999)}"


def random_address() -> str:
    block  = random.randint(1, 15)
    street = random.randint(1, 50)
    house  = random.randint(1, 120)
    area   = random.choice(AREAS)
    return f"Block {block}, Street {street}, House {house}, {area}, Kuwait"


def random_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_image_url(name: str) -> str:
    colors = ["34699A", "10b981", "f59e0b", "8b5cf6", "ef4444", "0ea5e9"]
    color  = random.choice(colors)
    return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background={color}&color=fff&size=128"


def main():
    init_db()
    conn = get_connection()
    conn.autocommit = False
    cur  = conn.cursor()

    print("Fetching existing products and suppliers …")
    cur.execute("SELECT id, seller_id FROM products ORDER BY id")
    products = cur.fetchall()
    if not products:
        print("No products found — run the main seed first.")
        conn.close()
        return
    product_ids  = [p["id"] for p in products]
    seller_ids   = list({p["seller_id"] for p in products if p["seller_id"]})
    prod_to_sell = {p["id"]: p["seller_id"] for p in products}

    # ── 1. Create 300 consumer users ─────────────────────────────────────────
    print("Creating 300 consumer users …")
    consumer_rows = []
    for i in range(1, 301):
        name  = random_name()
        email = f"consumer{i:03d}@smartdeals.kw"
        consumer_rows.append((
            name, email,
            fake_password_hash(email),
            random_image_url(name),
            "consumer",
        ))

    execute_values(cur, """
        INSERT INTO users (name, email, password_hash, image, role)
        VALUES %s
        ON CONFLICT (email) DO NOTHING
    """, consumer_rows)

    cur.execute("SELECT id FROM users WHERE role = 'consumer' ORDER BY id")
    consumer_ids = [r["id"] for r in cur.fetchall()]
    print(f"  → {len(consumer_ids)} consumers total")

    # ── 2. Create ~1020 deals (20 per product) ──────────────────────────────
    print("Creating 1020 deals …")
    now = datetime.now(timezone.utc)
    statuses_weights = [
        ("Active",     0.40),
        ("Successful", 0.25),
        ("Failed",     0.15),
        ("Stopped",    0.10),
        ("Upcoming",   0.10),
    ]
    status_pool = [s for s, w in statuses_weights for _ in range(int(w * 100))]

    deal_rows = []
    for pid in product_ids:
        seller_id = prod_to_sell[pid]
        base_price = round(random.uniform(0.250, 12.000), 3)
        for _ in range(20):
            status = random.choice(status_pool)
            if status == "Upcoming":
                start_delta = random.randint(1, 10)
                end_delta   = start_delta + random.randint(3, 15)
                start_time  = now + timedelta(days=start_delta)
                end_time    = now + timedelta(days=end_delta)
            elif status == "Active":
                start_delta = random.randint(1, 10)
                start_time  = now - timedelta(days=start_delta)
                end_time    = now + timedelta(days=random.randint(1, 14))
            else:
                start_delta = random.randint(5, 60)
                end_delta   = random.randint(1, 14)
                start_time  = now - timedelta(days=start_delta + end_delta)
                end_time    = now - timedelta(days=random.randint(1, start_delta))

            discount      = random.uniform(0.05, 0.35)
            actual_price  = round(base_price * (1 + random.uniform(0, 0.3)), 3)
            deal_price    = round(actual_price * (1 - discount), 3)
            target_qty    = random.randint(30, 500)

            deal_rows.append((
                pid, seller_id, target_qty, actual_price, deal_price,
                start_time, end_time, status,
            ))

    execute_values(cur, """
        INSERT INTO deals
            (product_id, seller_id, target_quantity, actual_price, price_per_unit,
             start_time, end_time, status)
        VALUES %s
    """, deal_rows)
    conn.commit()

    cur.execute("SELECT id, status, target_quantity, price_per_unit, seller_id FROM deals ORDER BY id DESC LIMIT %s",
                (len(deal_rows),))
    new_deals = cur.fetchall()
    print(f"  → {len(new_deals)} new deals created")

    # ── 3. Create 50-80 orders per deal ─────────────────────────────────────
    print("Seeding orders (50-80 per deal) …")
    order_batch   = []
    qty_updates   = {}   # deal_id -> total_quantity accumulator

    for deal in new_deals:
        did        = deal["id"]
        dstatus    = deal["status"]
        target     = deal["target_quantity"]
        price      = float(deal["price_per_unit"])
        seller_id  = deal["seller_id"]
        n_orders   = random.randint(50, 80)

        # Choose payment statuses based on deal state
        if dstatus == "Successful":
            pay_pool = PAYMENT_STATUSES_SUCCESSFUL
        elif dstatus in ("Failed", "Stopped"):
            pay_pool = PAYMENT_STATUSES_FAILED
        else:
            pay_pool = PAYMENT_STATUSES_ACTIVE

        total_qty_this_deal = 0
        for _ in range(n_orders):
            # Avoid using the seller themselves as a buyer
            uid      = random.choice([c for c in consumer_ids if c != seller_id] or consumer_ids)
            qty      = random.randint(1, 5)
            total    = round(price * qty, 3)
            pay_stat = random.choice(pay_pool)
            delv_stat = (random.choice(DELIVERY_STATUSES_CAPTURED)
                         if pay_stat == "Captured" else DELIVERY_STATUS_OTHER)
            order_batch.append((
                uid, did, qty, total, pay_stat,
                random_address(), random_mobile(), delv_stat,
            ))
            total_qty_this_deal += qty

        qty_updates[did] = total_qty_this_deal

    # Bulk insert all orders
    CHUNK = 2000
    total_inserted = 0
    for i in range(0, len(order_batch), CHUNK):
        chunk = order_batch[i:i + CHUNK]
        execute_values(cur, """
            INSERT INTO orders
                (user_id, deal_id, quantity, total_amount, payment_status,
                 delivery_address, mobile_number, delivery_status)
            VALUES %s
        """, chunk)
        total_inserted += len(chunk)
        if total_inserted % 10000 == 0 or i + CHUNK >= len(order_batch):
            print(f"  … {total_inserted:,} orders inserted")
        conn.commit()

    # ── 4. Set order_number for all orders missing it ────────────────────────
    print("Generating order numbers …")
    cur.execute("""
        UPDATE orders SET order_number = 'ORD-' || LPAD(id::text, 6, '0')
        WHERE order_number IS NULL
    """)

    # ── 5. Sync current_quantity on all deals ────────────────────────────────
    print("Syncing deal current_quantity …")
    cur.execute("""
        UPDATE deals d
        SET current_quantity = sub.total
        FROM (
            SELECT deal_id, SUM(quantity) AS total
            FROM orders
            WHERE payment_status != 'Cancelled'
            GROUP BY deal_id
        ) sub
        WHERE d.id = sub.deal_id
    """)

    conn.commit()

    # ── 6. Summary ───────────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='consumer'")
    print(f"\nConsumers : {cur.fetchone()['c']:,}")
    cur.execute("SELECT COUNT(*) AS c FROM deals")
    print(f"Deals     : {cur.fetchone()['c']:,}")
    cur.execute("SELECT COUNT(*) AS c FROM orders")
    print(f"Orders    : {cur.fetchone()['c']:,}")
    cur.execute("SELECT MIN(cnt) AS mn, MAX(cnt) AS mx, AVG(cnt)::int AS avg FROM (SELECT deal_id, COUNT(*) cnt FROM orders GROUP BY deal_id) t")
    row = cur.fetchone()
    print(f"Orders/deal: min={row['mn']}  max={row['mx']}  avg≈{row['avg']}")

    cur.close()
    conn.close()
    print("\nBulk seed complete!")


if __name__ == "__main__":
    main()
