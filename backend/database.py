import os
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
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            category VARCHAR(255),
            price_min NUMERIC(10,2),
            price_max NUMERIC(10,2),
            condition VARCHAR(100),
            usage VARCHAR(255),
            image VARCHAR(500),
            seller_name VARCHAR(255),
            seller_email VARCHAR(255),
            seller_contact VARCHAR(100),
            seller_image VARCHAR(500),
            location VARCHAR(255),
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS bids (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            buyer_name VARCHAR(255),
            buyer_email VARCHAR(255),
            buyer_photo VARCHAR(500),
            bid_price NUMERIC(10,2),
            contact VARCHAR(100),
            product_image VARCHAR(500),
            product_title VARCHAR(500),
            product_price NUMERIC(10,2),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.commit()
    cur.close()
    conn.close()
