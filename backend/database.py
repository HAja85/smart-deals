import os
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor

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
