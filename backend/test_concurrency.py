"""
Concurrency stress test for order placement.
Fires N simultaneous requests to POST /api/orders for the same deal
and verifies that current_quantity is exact (no lost updates).

Run with:  python3 -m backend.test_concurrency
"""
import threading
import requests
import json
import time
import sys
from backend.database import get_connection
from backend.auth import create_access_token

BASE_URL = "http://localhost:8000"
N_THREADS = 30          # simultaneous requests
QTY_PER_ORDER = 1       # each order buys 1 unit


def get_token(email: str, password: str) -> str:
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=10)
    r.raise_for_status()
    return r.json()["token"]


def find_test_deal(conn):
    """Find a small Active deal with lots of room, or create one."""
    cur = conn.cursor()
    cur.execute("""
        SELECT d.id, d.target_quantity, d.current_quantity, d.price_per_unit, d.seller_id
        FROM deals d
        WHERE d.status = 'Active'
          AND d.target_quantity - d.current_quantity >= %s
        ORDER BY d.target_quantity ASC
        LIMIT 1
    """, (N_THREADS * QTY_PER_ORDER + 10,))
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None


def get_consumer_tokens(conn, n: int):
    """Return tokens for n distinct consumers, creating them if needed."""
    cur = conn.cursor()
    cur.execute("SELECT id, email FROM users WHERE role='consumer' LIMIT %s", (n,))
    users = cur.fetchall()
    cur.close()

    tokens = []
    for u in users[:n]:
        # We build a JWT directly to avoid needing real passwords for seeded users
        token = create_access_token({"sub": str(u["id"]), "email": u["email"], "role": "consumer"})
        tokens.append(token)
    return tokens


def place_order(token: str, deal_id: int, results: list, idx: int):
    try:
        r = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "deal_id": deal_id,
                "quantity": QTY_PER_ORDER,
                "delivery_address": "Block 5, Street 10, House 3, Salmiya, Kuwait",
                "mobile_number": "+965 99001234",
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        results[idx] = {"status": r.status_code, "body": r.json()}
    except Exception as e:
        results[idx] = {"status": -1, "error": str(e)}


def run_test():
    conn = get_connection()

    print(f"\n{'='*60}")
    print(f"  Concurrency Test — {N_THREADS} simultaneous orders")
    print(f"{'='*60}\n")

    deal = find_test_deal(conn)
    if not deal:
        print("❌  No suitable Active deal found. Run seed_bulk first.")
        conn.close()
        return

    deal_id    = deal["id"]
    qty_before = deal["current_quantity"]
    target     = deal["target_quantity"]
    print(f"  Deal ID        : {deal_id}")
    print(f"  current_qty    : {qty_before}  /  target: {target}")
    print(f"  Expected change: +{N_THREADS * QTY_PER_ORDER}\n")

    tokens = get_consumer_tokens(conn, N_THREADS)
    if len(tokens) < N_THREADS:
        print(f"❌  Need {N_THREADS} consumers, only {len(tokens)} available.")
        conn.close()
        return

    results = [None] * N_THREADS
    threads = []
    for i in range(N_THREADS):
        t = threading.Thread(target=place_order, args=(tokens[i], deal_id, results, i))
        threads.append(t)

    print(f"  Firing {N_THREADS} threads simultaneously …")
    t0 = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.perf_counter() - t0
    print(f"  All threads finished in {elapsed:.2f}s\n")

    # ── Analyse results ──────────────────────────────────────────────────────
    success  = [r for r in results if r and r["status"] == 200]
    errors   = [r for r in results if r and r["status"] != 200]

    print(f"  ✅  Successful orders : {len(success)}")
    print(f"  ❌  Failed/rejected   : {len(errors)}")
    if errors[:3]:
        for e in errors[:3]:
            print(f"      HTTP {e['status']}: {e.get('body',{}).get('detail','?')}")

    # ── Verify DB quantity ───────────────────────────────────────────────────
    cur = conn.cursor()
    cur.execute("SELECT current_quantity FROM deals WHERE id = %s", (deal_id,))
    qty_after = cur.fetchone()["current_quantity"]

    # Real quantity from orders table (ground truth)
    cur.execute(
        "SELECT COALESCE(SUM(quantity),0) AS total FROM orders WHERE deal_id=%s AND payment_status != 'Cancelled'",
        (deal_id,),
    )
    actual_sum = cur.fetchone()["total"]
    cur.close()
    conn.close()

    expected_delta = len(success) * QTY_PER_ORDER
    real_delta     = qty_after - qty_before

    print(f"\n  DB current_quantity : {qty_before} → {qty_after}  (delta={real_delta:+d})")
    print(f"  SUM(orders.qty)     : {actual_sum}")
    print(f"  Expected delta      : +{expected_delta}")

    ok = (real_delta == expected_delta) and (qty_after == actual_sum)
    if ok:
        print(f"\n  ✅  PASS — no lost updates, no phantom writes. current_quantity is exact.")
    else:
        drift = real_delta - expected_delta
        print(f"\n  ❌  FAIL — quantity drift detected! delta={drift:+d}")
        print(f"      This would indicate a concurrency bug.")

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    run_test()
