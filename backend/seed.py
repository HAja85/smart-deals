"""
Seed script for SmartDeals Kuwait marketplace.
Run: python -m backend.seed
"""
import os
import sys
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta, timezone

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


PRODUCTS = [
    {"title": "Basmati Rice Premium", "category": "Grains & Rice", "brand": "Al-Doha", "unit": "25kg bag", "description": "Long grain premium basmati rice, perfect for everyday cooking.", "image": "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400"},
    {"title": "Jasmine Rice Long Grain", "category": "Grains & Rice", "brand": "Golden Harvest", "unit": "10kg bag", "description": "Fragrant jasmine rice imported from Thailand.", "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"},
    {"title": "Sunflower Cooking Oil", "category": "Oils & Fats", "brand": "Hayat", "unit": "5L bottle", "description": "Pure sunflower oil, rich in vitamin E, ideal for frying.", "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400"},
    {"title": "Extra Virgin Olive Oil", "category": "Oils & Fats", "brand": "Borges", "unit": "3L tin", "description": "Cold-pressed extra virgin olive oil from Spain.", "image": "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400"},
    {"title": "Mineral Water Carton", "category": "Beverages", "brand": "Al-Ain", "unit": "24 × 1.5L", "description": "Pure natural mineral water from UAE mountains.", "image": "https://images.unsplash.com/photo-1601590960857-6da5e42d49de?w=400"},
    {"title": "Full Cream Milk Pack", "category": "Dairy", "brand": "Almarai", "unit": "12 × 1L", "description": "Fresh full cream UHT milk, high in calcium.", "image": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"},
    {"title": "Low Fat Milk", "category": "Dairy", "brand": "KDD", "unit": "12 × 1L", "description": "Light low-fat milk, great for health-conscious families.", "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"},
    {"title": "Fresh Eggs Tray", "category": "Eggs & Poultry", "brand": "Kuwait Farms", "unit": "30 eggs tray", "description": "Farm-fresh Grade A eggs, rich in protein.", "image": "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400"},
    {"title": "White Sugar Premium", "category": "Sugar & Sweeteners", "brand": "Al-Khaleej", "unit": "5kg bag", "description": "Pure refined white sugar for baking and cooking.", "image": "https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400"},
    {"title": "Instant Noodles Carton", "category": "Instant Food", "brand": "Indomie", "unit": "40 packs", "description": "Popular instant noodles, ready in 3 minutes.", "image": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400"},
    {"title": "Canned Tuna in Oil", "category": "Canned Goods", "brand": "Albacore", "unit": "48 × 170g cans", "description": "Premium solid white tuna in sunflower oil.", "image": "https://images.unsplash.com/photo-1618518974773-0e52e7d4eaef?w=400"},
    {"title": "Canned Tomatoes Crushed", "category": "Canned Goods", "brand": "Mutti", "unit": "24 × 400g cans", "description": "Italian crushed tomatoes for pasta and sauces.", "image": "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400"},
    {"title": "Frozen Mixed Vegetables", "category": "Frozen Foods", "brand": "Green Giant", "unit": "10 × 1kg bags", "description": "Quick-frozen mixed vegetables, no preservatives.", "image": "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400"},
    {"title": "Frozen Chicken Breast", "category": "Frozen Foods", "brand": "Americana", "unit": "2kg pack", "description": "Skinless boneless chicken breast, halal certified.", "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400"},
    {"title": "Potato Chips Variety Pack", "category": "Snacks", "brand": "Lay's", "unit": "30 × 40g bags", "description": "Assorted flavors crispy potato chips.", "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400"},
    {"title": "Chocolate Biscuits", "category": "Snacks", "brand": "McVitie's", "unit": "24 × 200g packs", "description": "Dark chocolate digestive biscuits.", "image": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400"},
    {"title": "Orange Juice 100%", "category": "Beverages", "brand": "Tropicana", "unit": "12 × 1L cartons", "description": "Pure squeezed orange juice, no added sugar.", "image": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400"},
    {"title": "Green Tea Bags Box", "category": "Beverages", "brand": "Lipton", "unit": "6 × 100 tea bags", "description": "Premium green tea bags, rich in antioxidants.", "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"},
    {"title": "Laundry Detergent Powder", "category": "Cleaning Supplies", "brand": "Ariel", "unit": "10kg box", "description": "Powerful cleaning for white and colored clothes.", "image": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400"},
    {"title": "Dishwashing Liquid", "category": "Cleaning Supplies", "brand": "Fairy", "unit": "6 × 1L bottles", "description": "Ultra-concentrated dish soap for tough grease.", "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400"},
    {"title": "Toilet Paper Pack", "category": "Household", "brand": "Kleenex", "unit": "36 rolls", "description": "Soft 3-ply toilet paper, hypoallergenic.", "image": "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400"},
    {"title": "Paper Towels Pack", "category": "Household", "brand": "Bounty", "unit": "12 rolls", "description": "Strong absorbent paper towels for kitchen use.", "image": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400"},
    {"title": "Whole Wheat Pasta", "category": "Pasta & Noodles", "brand": "Barilla", "unit": "20 × 500g packs", "description": "High-fiber whole wheat penne rigate.", "image": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400"},
    {"title": "Spaghetti Premium", "category": "Pasta & Noodles", "brand": "De Cecco", "unit": "20 × 500g packs", "description": "Classic Italian spaghetti, bronze-die cut.", "image": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400"},
    {"title": "Butter Unsalted Pack", "category": "Dairy", "brand": "Elle & Vire", "unit": "12 × 250g packs", "description": "Pure unsalted French butter for baking.", "image": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400"},
    {"title": "Cheddar Cheese Sliced", "category": "Dairy", "brand": "President", "unit": "10 × 400g packs", "description": "Mild cheddar cheese slices, perfect for sandwiches.", "image": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"},
    {"title": "Labneh Cream Cheese", "category": "Dairy", "brand": "Almarai", "unit": "12 × 500g tubs", "description": "Thick creamy labneh, traditional Arabic cheese.", "image": "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=400"},
    {"title": "Honey Pure Natural", "category": "Sweeteners", "brand": "Sidr", "unit": "12 × 500g jars", "description": "Raw natural sidr honey from Yemen.", "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400"},
    {"title": "Chickpeas Canned", "category": "Canned Goods", "brand": "Zarreen", "unit": "24 × 400g cans", "description": "Ready-to-eat cooked chickpeas for hummus and salads.", "image": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"},
    {"title": "Kidney Beans Red", "category": "Canned Goods", "brand": "Zarreen", "unit": "24 × 400g cans", "description": "Tender red kidney beans, great for stews.", "image": "https://images.unsplash.com/photo-1542282811-943ef1a977c3?w=400"},
    {"title": "Corn Flakes Cereal", "category": "Breakfast", "brand": "Kellogg's", "unit": "6 × 500g boxes", "description": "Crispy golden corn flakes, fortified with vitamins.", "image": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400"},
    {"title": "Oat Bran Rolled Oats", "category": "Breakfast", "brand": "Quaker", "unit": "6 × 1kg bags", "description": "Heart-healthy whole rolled oats for porridge.", "image": "https://images.unsplash.com/photo-1614961907271-7c0a6e0a0ef4?w=400"},
    {"title": "Peanut Butter Smooth", "category": "Spreads", "brand": "Skippy", "unit": "12 × 500g jars", "description": "Creamy smooth peanut butter, no added sugar.", "image": "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400"},
    {"title": "Strawberry Jam", "category": "Spreads", "brand": "Smucker's", "unit": "12 × 340g jars", "description": "Sweet strawberry jam made with real fruit.", "image": "https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=400"},
    {"title": "Canned Sweet Corn", "category": "Canned Goods", "brand": "Green Giant", "unit": "24 × 340g cans", "description": "Sweet yellow corn kernels, ready to serve.", "image": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400"},
    {"title": "Tomato Paste Cans", "category": "Cooking Essentials", "brand": "Heinz", "unit": "24 × 200g cans", "description": "Concentrated tomato paste for rich sauces.", "image": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400"},
    {"title": "Black Pepper Ground", "category": "Spices", "brand": "Shan", "unit": "24 × 100g packs", "description": "Freshly ground black pepper, bold flavor.", "image": "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400"},
    {"title": "Cumin Seeds Whole", "category": "Spices", "brand": "Shan", "unit": "24 × 100g packs", "description": "Aromatic whole cumin seeds for spice blends.", "image": "https://images.unsplash.com/photo-1530092285049-1c42085fd395?w=400"},
    {"title": "Dates Medjool Premium", "category": "Dried Fruits", "brand": "Al-Qassim", "unit": "5kg box", "description": "Plump juicy Medjool dates from Saudi Arabia.", "image": "https://images.unsplash.com/photo-1609171578476-27f5e60d1248?w=400"},
    {"title": "Mixed Nuts Premium", "category": "Nuts & Seeds", "brand": "Munchies", "unit": "10 × 500g bags", "description": "Premium roasted mixed nuts — cashews, almonds, walnuts.", "image": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400"},
    {"title": "All-Purpose Flour", "category": "Baking", "brand": "Gold Medal", "unit": "10 × 1kg bags", "description": "High-quality all-purpose flour for baking.", "image": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400"},
    {"title": "Active Dry Yeast", "category": "Baking", "brand": "Fleischmann's", "unit": "50 × 7g sachets", "description": "Fast-acting dry yeast for bread and pastries.", "image": "https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=400"},
    {"title": "UHT Cream Cooking", "category": "Dairy", "brand": "Elle & Vire", "unit": "12 × 500ml", "description": "Cooking cream, perfect for soups and sauces.", "image": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400"},
    {"title": "Sparkling Water Lemon", "category": "Beverages", "brand": "Perrier", "unit": "24 × 330ml cans", "description": "Refreshing lemon sparkling water, zero calories.", "image": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400"},
    {"title": "Energy Drink Original", "category": "Beverages", "brand": "Red Bull", "unit": "24 × 250ml cans", "description": "Classic energy drink with taurine and caffeine.", "image": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400"},
    {"title": "Frozen Pizza Margherita", "category": "Frozen Foods", "brand": "Dr. Oetker", "unit": "6 × 400g pizzas", "description": "Stone-baked frozen margherita pizza.", "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400"},
    {"title": "Ice Cream Vanilla Tub", "category": "Frozen Foods", "brand": "Baskin-Robbins", "unit": "4 × 2L tubs", "description": "Creamy vanilla ice cream with real vanilla beans.", "image": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400"},
    {"title": "Ketchup Bottles", "category": "Condiments", "brand": "Heinz", "unit": "12 × 570g bottles", "description": "Classic Heinz tomato ketchup.", "image": "https://images.unsplash.com/photo-1629096491024-8bfd5a5ad9a6?w=400"},
    {"title": "Mayonnaise Jars", "category": "Condiments", "brand": "Hellmann's", "unit": "12 × 400g jars", "description": "Rich creamy real mayonnaise.", "image": "https://images.unsplash.com/photo-1612892483236-52d32a0e0ac1?w=400"},
    {"title": "Arabic Bread Pita", "category": "Bread & Bakery", "brand": "KCC", "unit": "20 × 6-pack bags", "description": "Fresh soft pita bread, traditional Kuwaiti style.", "image": "https://images.unsplash.com/photo-1534620808146-d33bb39128b2?w=400"},
    {"title": "Laundry Softener", "category": "Cleaning Supplies", "brand": "Comfort", "unit": "6 × 3L bottles", "description": "Fabric softener with fresh spring scent.", "image": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400"},
]

DEALS_CONFIG = [
    {"product_idx": 0,  "target": 100, "price": 8.500,  "days": 7},
    {"product_idx": 2,  "target": 80,  "price": 3.750,  "days": 5},
    {"product_idx": 4,  "target": 200, "price": 2.200,  "days": 3},
    {"product_idx": 5,  "target": 150, "price": 4.800,  "days": 6},
    {"product_idx": 7,  "target": 300, "price": 1.250,  "days": 4},
    {"product_idx": 9,  "target": 120, "price": 2.900,  "days": 10},
    {"product_idx": 12, "target": 90,  "price": 3.500,  "days": 8},
    {"product_idx": 14, "target": 200, "price": 1.800,  "days": 2},
    {"product_idx": 18, "target": 60,  "price": 12.000, "days": 14},
    {"product_idx": 20, "target": 500, "price": 5.750,  "days": 5},
    {"product_idx": 22, "target": 100, "price": 3.200,  "days": 7},
    {"product_idx": 28, "target": 80,  "price": 1.900,  "days": 3},
    {"product_idx": 33, "target": 150, "price": 2.400,  "days": 6},
    {"product_idx": 38, "target": 200, "price": 18.500, "days": 12},
    {"product_idx": 39, "target": 70,  "price": 9.800,  "days": 9},
    {"product_idx": 45, "target": 120, "price": 4.200,  "days": 4},
    {"product_idx": 46, "target": 90,  "price": 6.500,  "days": 7},
    {"product_idx": 47, "target": 250, "price": 1.100,  "days": 5},
    {"product_idx": 48, "target": 200, "price": 1.350,  "days": 3},
    {"product_idx": 49, "target": 60,  "price": 2.800,  "days": 10},
]


def run_seed():
    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    print("Seeding users...")
    supplier_id = None
    consumer_id = None

    for u in [
        {"name": "Al-Rashid Supplies Co.", "email": "supplier@smartdeals.kw", "password": "Supplier123", "role": "supplier",
         "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"},
        {"name": "Ahmed Al-Sabah", "email": "consumer@smartdeals.kw", "password": "Consumer123", "role": "consumer",
         "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"},
    ]:
        cur.execute("SELECT id FROM users WHERE email = %s", (u["email"],))
        existing = cur.fetchone()
        if existing:
            uid = existing["id"]
        else:
            hashed = bcrypt.hashpw(u["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cur.execute(
                "INSERT INTO users (name, email, password_hash, image, role) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (u["name"], u["email"], hashed, u["image"], u["role"])
            )
            uid = cur.fetchone()["id"]
        if u["role"] == "supplier":
            supplier_id = uid
        else:
            consumer_id = uid

    print(f"Supplier ID: {supplier_id}, Consumer ID: {consumer_id}")

    print("Seeding products...")
    product_ids = []
    for p in PRODUCTS:
        cur.execute("SELECT id FROM products WHERE title = %s AND seller_id = %s", (p["title"], supplier_id))
        existing = cur.fetchone()
        if existing:
            product_ids.append(existing["id"])
        else:
            cur.execute(
                """INSERT INTO products (title, category, description, image, brand, unit, seller_id, seller_name, seller_email, status)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'active') RETURNING id""",
                (p["title"], p["category"], p["description"], p["image"], p["brand"], p["unit"],
                 supplier_id, "Al-Rashid Supplies Co.", "supplier@smartdeals.kw")
            )
            product_ids.append(cur.fetchone()["id"])

    print(f"Products seeded: {len(product_ids)}")

    print("Seeding deals...")
    deal_ids = []
    for cfg in DEALS_CONFIG:
        pidx = cfg["product_idx"]
        if pidx >= len(product_ids):
            continue
        product_id = product_ids[pidx]

        cur.execute("SELECT id FROM deals WHERE product_id = %s AND seller_id = %s", (product_id, supplier_id))
        existing = cur.fetchone()
        if existing:
            deal_ids.append(existing["id"])
            continue

        end_time = now + timedelta(days=cfg["days"])
        cur.execute(
            """INSERT INTO deals (product_id, seller_id, target_quantity, price_per_unit, end_time, status)
               VALUES (%s,%s,%s,%s,%s,'Active') RETURNING id""",
            (product_id, supplier_id, cfg["target"], cfg["price"], end_time)
        )
        deal_ids.append(cur.fetchone()["id"])

    print(f"Deals seeded: {len(deal_ids)}")

    print("Seeding orders...")
    order_count = 0
    for i, deal_id in enumerate(deal_ids[:12]):
        cur.execute("SELECT * FROM deals WHERE id = %s", (deal_id,))
        deal = dict(cur.fetchone())
        cur.execute("SELECT COUNT(*) as cnt FROM orders WHERE deal_id = %s AND user_id = %s", (deal_id, consumer_id))
        if cur.fetchone()["cnt"] > 0:
            continue
        qty = max(5, deal["target_quantity"] // 4)
        total = float(deal["price_per_unit"]) * qty
        cur.execute(
            "INSERT INTO orders (user_id, deal_id, quantity, total_amount, payment_status) VALUES (%s,%s,%s,%s,'Pending') RETURNING id",
            (consumer_id, deal_id, qty, total)
        )
        cur.execute("UPDATE deals SET current_quantity = current_quantity + %s WHERE id = %s", (qty, deal_id))
        order_count += 1

    cur.execute("""
        UPDATE deals SET status = 'Successful', current_quantity = target_quantity
        WHERE id IN (SELECT id FROM deals ORDER BY id LIMIT 3)
    """)
    cur.execute("""
        UPDATE orders SET payment_status = 'Captured'
        WHERE deal_id IN (SELECT id FROM deals WHERE status = 'Successful')
    """)

    conn.commit()
    cur.close()
    conn.close()
    print(f"Orders seeded: {order_count}")
    print("Seed complete!")


if __name__ == "__main__":
    run_seed()
