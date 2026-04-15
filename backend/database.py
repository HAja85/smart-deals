import os
import bcrypt
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timezone, timedelta

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            image VARCHAR(500),
            role VARCHAR(50) DEFAULT 'consumer',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'consumer'")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(30)")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            category VARCHAR(255),
            description TEXT,
            image VARCHAR(500),
            brand VARCHAR(255),
            unit VARCHAR(100),
            seller_id INTEGER REFERENCES users(id),
            seller_name VARCHAR(255),
            seller_email VARCHAR(255),
            seller_contact VARCHAR(100),
            seller_image VARCHAR(500),
            location VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)")
    cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(100)")
    cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS deals (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            seller_id INTEGER REFERENCES users(id),
            target_quantity INTEGER NOT NULL,
            current_quantity INTEGER DEFAULT 0,
            actual_price NUMERIC(10,3),
            price_per_unit NUMERIC(10,3) NOT NULL,
            start_time TIMESTAMP NOT NULL DEFAULT NOW(),
            end_time TIMESTAMP NOT NULL,
            status VARCHAR(50) DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_price NUMERIC(10,3)")
    cur.execute("ALTER TABLE deals ADD COLUMN IF NOT EXISTS start_time TIMESTAMP NOT NULL DEFAULT NOW()")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL,
            total_amount NUMERIC(10,3),
            payment_status VARCHAR(50) DEFAULT 'Pending',
            stripe_payment_intent_id VARCHAR(255),
            stripe_client_secret VARCHAR(500),
            paid_at TIMESTAMP,
            refund_status VARCHAR(50) DEFAULT 'None',
            refund_amount NUMERIC(10,3),
            refund_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_client_secret VARCHAR(500)")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'None'")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,3)")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_time TIMESTAMP")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20)")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(30)")
    cur.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30) DEFAULT 'Pending'")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'System',
            is_read BOOLEAN DEFAULT FALSE,
            deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id SERIAL PRIMARY KEY,
            mobile_number VARCHAR(30) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS email_otps (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.commit()
    cur.close()
    conn.close()


def seed_db():
    """Create default admin, supplier, and consumer accounts if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()

    seed_users = [
        {
            "name": "Admin",
            "email": "admin@smartdeals.kw",
            "password": "Admin@123",
            "role": "admin",
            "mobile": "+96500000001",
        },
        {
            "name": "Demo Supplier",
            "email": "supplier@smartdeals.kw",
            "password": "Supplier123",
            "role": "supplier",
            "mobile": "+96500000002",
        },
        {
            "name": "Demo Consumer",
            "email": "consumer@smartdeals.kw",
            "password": "Consumer123",
            "role": "consumer",
            "mobile": "+96500000003",
        },
    ]

    for u in seed_users:
        cur.execute("SELECT id FROM users WHERE email = %s", (u["email"],))
        if not cur.fetchone():
            hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
            cur.execute(
                """INSERT INTO users (name, email, password_hash, role, mobile_number, is_verified)
                   VALUES (%s, %s, %s, %s, %s, TRUE)""",
                (u["name"], u["email"], hashed, u["role"], u["mobile"]),
            )

    conn.commit()
    cur.close()
    conn.close()


def seed_demo_data():
    """Seed 50 products, 50 deals and 50 orders — runs only if fewer than 5 products exist."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) AS cnt FROM products")
    if (cur.fetchone()["cnt"] or 0) >= 5:
        cur.close()
        conn.close()
        return

    now = datetime.now(timezone.utc)

    cur.execute("SELECT id FROM users WHERE email = %s", ("supplier@smartdeals.kw",))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close(); return
    supplier_id = row["id"]

    cur.execute("SELECT id FROM users WHERE email = %s", ("consumer@smartdeals.kw",))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close(); return
    consumer_id = row["id"]

    IMG = {
        "rice":     "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80",
        "oil":      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80",
        "milk":     "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80",
        "water":    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500&q=80",
        "juice":    "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80",
        "cheese":   "https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=500&q=80",
        "yogurt":   "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80",
        "canned":   "https://images.unsplash.com/photo-1584990347449-a8a8c9e2e9e4?w=500&q=80",
        "snack":    "https://images.unsplash.com/photo-1619671946062-43abe5d3f9bc?w=500&q=80",
        "cleaning": "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=500&q=80",
        "frozen":   "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&q=80",
        "noodles":  "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80",
        "butter":   "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&q=80",
        "eggs":     "https://images.unsplash.com/photo-1569288063643-5d29ad54df3f?w=500&q=80",
        "spice":    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80",
        "dates":    "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=500&q=80",
        "coffee":   "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=500&q=80",
        "soda":     "https://images.unsplash.com/photo-1629203432180-71e9b18d855a?w=500&q=80",
        "pasta":    "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=500&q=80",
    }

    # (title, category, brand, unit, img_key, description, base_price_kwd, location)
    PRODUCTS = [
        # Grains & Rice (6)
        ("Sella Basmati Rice", "Grains & Rice", "Al-Doha", "25 kg bag", "rice", "Premium long-grain sella basmati rice, ideal for machboos and kabsa. Sourced from the Himalayan foothills.", 4.500, "Salmiya"),
        ("Jasmine Rice", "Grains & Rice", "Royal Umbrella", "10 kg bag", "rice", "Fragrant Thai jasmine rice. Soft, sticky texture perfect for Asian-style cooking.", 3.200, "Kuwait City"),
        ("White Basmati Rice", "Grains & Rice", "India Gate", "5 kg bag", "rice", "Extra-long basmati rice with natural aroma. Aged 2 years for superior quality.", 2.600, "Hawalli"),
        ("Egyptian Short-Grain Rice", "Grains & Rice", "Sunwhite", "10 kg bag", "rice", "Classic short-grain rice ideal for soups and stuffed dishes.", 2.900, "Farwaniya"),
        ("Brown Basmati Rice", "Grains & Rice", "Daawat", "5 kg bag", "rice", "Whole grain basmati rice. High in fibre, nutty flavour, great for healthy meals.", 3.800, "Salmiya"),
        ("Vermicelli Rice Mix", "Grains & Rice", "Seara", "1 kg × 10 packs", "rice", "Ready-mix rice with vermicelli for classic Arabic rice dishes.", 5.500, "Rumaithiya"),
        # Oils & Fats (5)
        ("Extra Virgin Olive Oil", "Oils & Fats", "Rahma", "5 L tin", "oil", "Cold-pressed extra virgin olive oil from the Mediterranean. Rich in antioxidants.", 4.500, "Salmiya"),
        ("Sunflower Cooking Oil", "Oils & Fats", "Hayat", "5 L bottle", "oil", "Light, neutral sunflower oil for everyday frying. High smoke point.", 2.800, "Kuwait City"),
        ("Corn Oil", "Oils & Fats", "Mazola", "4 L bottle", "oil", "Cholesterol-free corn oil. Ideal for deep frying, baking, and sautéing.", 3.200, "Hawalli"),
        ("Vegetable Ghee", "Oils & Fats", "Noor", "2 kg tin", "oil", "Smooth vegetable ghee perfect for Kuwaiti sweets and rice dishes.", 2.100, "Farwaniya"),
        ("Pure Cow Ghee", "Oils & Fats", "Al Marai", "1 kg jar × 4", "butter", "100% pure clarified butter from fresh cow milk. Rich flavour for rice and halwa.", 6.800, "Salmiya"),
        # Dairy (6)
        ("Full Fat Fresh Milk", "Dairy", "Al Marai", "1 L carton × 12", "milk", "Fresh pasteurised full-fat milk. Rich in calcium and vitamin D.", 3.600, "Kuwait City"),
        ("Low-Fat Fresh Milk", "Dairy", "Baladna", "2 L bottle × 6", "milk", "Low-fat fresh milk, ideal for health-conscious families.", 4.200, "Hawalli"),
        ("Halloumi Cheese", "Dairy", "Al Marai", "500 g pack × 10", "cheese", "Semi-hard Halloumi cheese. Grills and fries beautifully without melting.", 9.500, "Salmiya"),
        ("Greek Yogurt", "Dairy", "Activia", "170 g pot × 12", "yogurt", "Thick and creamy Greek-style yogurt. High protein, probiotic-rich.", 3.200, "Kuwait City"),
        ("Labneh Strained Yogurt", "Dairy", "Puck", "500 g tub × 6", "yogurt", "Traditional strained labneh. Great for breakfast spreads.", 4.800, "Rumaithiya"),
        ("Cheddar Cheese Slices", "Dairy", "Kraft", "400 g pack × 6", "cheese", "Individually wrapped cheddar slices. Perfect for sandwiches and burgers.", 5.400, "Farwaniya"),
        # Beverages (7)
        ("Mineral Water 1.5L", "Beverages", "Evian", "1.5 L × 12 bottles", "water", "Natural mineral water from the French Alps. Balanced mineral content.", 3.900, "Kuwait City"),
        ("Still Water 500ml", "Beverages", "Aquafina", "500 ml × 24 bottles", "water", "Purified still drinking water. Crisp and refreshing hydration on the go.", 2.400, "Salmiya"),
        ("Orange Juice", "Beverages", "Tropicana", "1 L carton × 12", "juice", "100% pure squeezed orange juice. No added sugar or preservatives.", 6.000, "Hawalli"),
        ("Apple Juice", "Beverages", "Almarai", "1 L carton × 12", "juice", "Freshly pressed apple juice. Rich in vitamins with a naturally sweet taste.", 5.500, "Kuwait City"),
        ("Cola Soft Drink", "Beverages", "Pepsi", "330 ml can × 24", "soda", "Iconic cola flavour carbonated soft drink. Perfect for gatherings.", 4.800, "Farwaniya"),
        ("Energy Drink", "Beverages", "Red Bull", "250 ml can × 24", "soda", "Original Red Bull with taurine, caffeine and B-vitamins.", 9.600, "Salmiya"),
        ("Instant Coffee", "Beverages", "Nescafé Gold", "200 g jar × 6", "coffee", "Rich and smooth Nescafé Gold. Full-bodied flavour with golden crema.", 7.800, "Kuwait City"),
        # Canned Goods (5)
        ("Baked Beans in Tomato Sauce", "Canned Goods", "Heinz", "415 g × 12 cans", "canned", "Classic baked beans in rich tomato sauce. A quick protein-packed meal.", 4.200, "Hawalli"),
        ("Canned Sweetcorn", "Canned Goods", "Del Monte", "340 g × 12 cans", "canned", "Sweet golden whole kernel corn. No added salt or sugar.", 3.600, "Kuwait City"),
        ("Tuna in Olive Oil", "Canned Goods", "John West", "170 g × 24 cans", "canned", "Premium skipjack tuna in extra virgin olive oil. High in omega-3.", 8.400, "Salmiya"),
        ("Chickpeas in Brine", "Canned Goods", "Afia", "400 g × 24 cans", "canned", "Ready-to-eat cooked chickpeas. Perfect for hummus, salads and stews.", 5.760, "Rumaithiya"),
        ("Tomato Paste", "Canned Goods", "Heinz", "200 g × 12 cans", "canned", "Concentrated tomato paste with deep flavour. Essential for sauces.", 3.000, "Farwaniya"),
        # Snacks & Spreads (5)
        ("Original Pringles", "Snacks", "Pringles", "165 g × 12 tubes", "snack", "Original flavour stackable potato crisps. Perfect for sharing.", 7.800, "Kuwait City"),
        ("Classic Lays Chips", "Snacks", "Lays", "150 g × 24 bags", "snack", "Light and crispy classic salted potato chips. The original crowd pleaser.", 6.000, "Salmiya"),
        ("Oreo Cookies", "Snacks", "Oreo", "440 g pack × 6", "snack", "Crunchy chocolate sandwich cookies with sweet cream filling.", 5.400, "Hawalli"),
        ("Kinder Bueno Bars", "Snacks", "Kinder", "43 g × 24 bars", "snack", "Light crispy wafer with smooth hazelnut milk chocolate filling.", 7.200, "Kuwait City"),
        ("Nutella Hazelnut Spread", "Spreads", "Ferrero", "750 g jar × 6", "snack", "Iconic hazelnut chocolate spread. Made with quality cocoa and real hazelnuts.", 11.400, "Salmiya"),
        # Cleaning Supplies (4)
        ("Ariel Detergent Powder", "Cleaning Supplies", "Ariel", "5 kg box", "cleaning", "Advanced stain-fighting laundry powder. Removes tough stains in cold water.", 3.900, "Farwaniya"),
        ("Fairy Dishwashing Liquid", "Cleaning Supplies", "Fairy", "750 ml × 6 bottles", "cleaning", "Concentrated dishwashing liquid. Gentle on hands, tough on grease.", 4.800, "Kuwait City"),
        ("Persil Color Detergent", "Cleaning Supplies", "Persil", "4.5 kg box", "cleaning", "Colour-care laundry powder that keeps colours vibrant wash after wash.", 4.500, "Salmiya"),
        ("Dettol Antibacterial Handwash", "Cleaning Supplies", "Dettol", "250 ml × 6 pumps", "cleaning", "Kills 99.9% of bacteria. pH-balanced formula gentle on skin.", 4.200, "Hawalli"),
        # Frozen Foods (4)
        ("Halal Frozen Whole Chicken", "Frozen Foods", "Al Safa", "2 kg × 4 bags", "frozen", "Halal-certified whole frozen chicken. Grain-fed and hormone-free.", 6.800, "Kuwait City"),
        ("Crispy French Fries", "Frozen Foods", "McCain", "2 kg bag × 3", "frozen", "Golden crispy crinkle-cut fries. Bake or fry for the perfect side dish.", 4.500, "Salmiya"),
        ("Frozen Sweet Peas", "Frozen Foods", "Birds Eye", "1 kg bag × 6", "frozen", "Tender sweet peas flash-frozen within hours of harvest for peak freshness.", 3.600, "Farwaniya"),
        ("Frozen Tiger Shrimp", "Frozen Foods", "SeaBest", "1 kg bag × 4", "frozen", "Wild-caught, pre-cleaned and deveined tiger shrimp. Ready to cook.", 8.800, "Rumaithiya"),
        # Instant Food (4)
        ("Indomie Mi Goreng Noodles", "Instant Food", "Indomie", "75 g × 40 packs", "noodles", "Famous Indonesian stir-fried instant noodles with rich savoury seasoning.", 3.200, "Kuwait City"),
        ("Maggi Chicken Noodles", "Instant Food", "Maggi", "80 g × 36 packs", "noodles", "Quick-cook chicken-flavoured instant noodles. Ready in 2 minutes.", 2.880, "Hawalli"),
        ("Knorr Chicken Stock Cubes", "Instant Food", "Knorr", "20 cubes × 10 boxes", "spice", "Rich chicken stock cubes. Add depth to soups, sauces and rice.", 4.000, "Kuwait City"),
        ("Pasta Penne Rigate", "Pasta & Noodles", "Barilla", "500 g × 12 packs", "pasta", "Italian bronze-die cut penne pasta. Holds sauces perfectly.", 4.800, "Salmiya"),
        # Eggs & Dairy extras (3)
        ("Free-Range Eggs", "Eggs & Poultry", "Hayat", "30-egg tray × 5 trays", "eggs", "Farm-fresh free-range eggs. Rich orange yolk, superior taste.", 6.750, "Farwaniya"),
        ("Lurpak Unsalted Butter", "Dairy", "Lurpak", "500 g pack × 4", "butter", "Danish unsalted butter. Creamy, smooth taste for cooking and baking.", 7.200, "Salmiya"),
        # Spices & Dried (3)
        ("Cardamom Pods", "Spices", "Schwartz", "100 g jar × 12", "spice", "Whole green cardamom pods for Arabian coffee (qahwa) and biryani.", 7.200, "Kuwait City"),
        ("Mixed Spice Blend", "Spices", "Shan", "100 g × 12 packs", "spice", "Authentic mixed spice blend for machboos, kabsa and grills.", 3.600, "Hawalli"),
        ("Premium Medjool Dates", "Dried Fruits", "Al Bara", "1 kg box × 6", "dates", "Premium Medjool dates — the king of dates. Naturally sweet, soft and sticky.", 10.200, "Rumaithiya"),
    ]

    product_ids = []
    for p in PRODUCTS:
        title, category, brand, unit, img_key, desc, price, location = p
        image = IMG[img_key]
        cur.execute("""
            INSERT INTO products (title, category, brand, unit, image, description,
                                  seller_id, seller_name, seller_email, location, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'active') RETURNING id
        """, (title, category, brand, unit, image, desc,
              supplier_id, "Demo Supplier", "supplier@smartdeals.kw", location))
        product_ids.append((cur.fetchone()["id"], price))

    deal_ids = []
    for i, (pid, base_price) in enumerate(product_ids):
        actual = round(base_price * random.uniform(1.12, 1.30), 3)
        price  = base_price
        target = random.choice([50, 100, 150, 200, 250])

        if i < 30:
            status = "Active"
            start  = now - timedelta(days=random.randint(2, 15))
            end    = now + timedelta(days=random.randint(3, 25))
            filled = random.randint(int(target * 0.10), int(target * 0.95))
        elif i < 40:
            status = "Upcoming"
            start  = now + timedelta(days=random.randint(2, 10))
            end    = start + timedelta(days=random.randint(5, 20))
            filled = 0
        else:
            status = "Completed"
            start  = now - timedelta(days=random.randint(20, 40))
            end    = now - timedelta(days=random.randint(1, 10))
            filled = target

        cur.execute("""
            INSERT INTO deals (product_id, seller_id, target_quantity, current_quantity,
                               actual_price, price_per_unit, start_time, end_time, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (pid, supplier_id, target, filled, actual, price, start, end, status))
        deal_ids.append((cur.fetchone()["id"], status, filled, price))

    order_num = 1
    for j in range(50):
        eligible = [(did, st, fil, pr) for did, st, fil, pr in deal_ids if st in ("Active", "Completed") and fil > 0]
        if not eligible:
            break
        did, dstatus, _, unit_price = random.choice(eligible)

        qty   = random.randint(1, 5)
        total = round(unit_price * qty, 3)

        pay_status = random.choice(["Paid", "Paid", "Paid", "Captured", "Pending"])
        del_status = (
            "Delivered" if dstatus == "Completed" and pay_status in ("Paid", "Captured") else
            "Shipped"   if pay_status in ("Paid", "Captured") else
            "Pending"
        )

        paid_at = (now - timedelta(days=random.randint(1, 10))) if pay_status in ("Paid", "Captured") else None
        onum    = f"ORD-{1000 + order_num:04d}"
        pi_id   = f"pi_demo_{random.randint(100000, 999999)}"

        cur.execute("""
            INSERT INTO orders (user_id, deal_id, quantity, total_amount, payment_status,
                                stripe_payment_intent_id, paid_at, delivery_status,
                                order_number, delivery_address, mobile_number)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (consumer_id, did, qty, total, pay_status, pi_id, paid_at,
              del_status, onum, "Block 5, Street 12, Salmiya, Kuwait", "+96560000099"))
        order_num += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Demo seed: inserted {len(product_ids)} products, {len(deal_ids)} deals, {order_num - 1} orders.")
