# SmartDeals Kuwait

Kuwait's group-buying marketplace for supermarket essentials. Built with React + Vite frontend and FastAPI + PostgreSQL backend.

## Architecture

### Frontend (React + Vite)
- **React 19** with React Router 7
- **Vite 7** dev server on port **5000** (proxies `/api` → backend)
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **Axios** / fetch for API calls
- **React Toastify** + **SweetAlert2** for notifications

### Backend (FastAPI + PostgreSQL)
- **FastAPI** REST API on port **8000**
- **PostgreSQL** (Replit built-in) accessed via `DATABASE_URL`
- **JWT authentication** (python-jose + bcrypt)
- **APScheduler** background job (every minute) to check deal statuses
- **psycopg2** for database connectivity

## Running the App

Two workflows:
- **Start Backend**: `bash start_backend.sh` → FastAPI on port 8000
- **Start application**: `npm run dev` → Vite on port 5000

## Database Schema

```sql
users       — id, name, email, password_hash, image, role (supplier|consumer), created_at
products    — id, title, category, brand, unit, description, image, seller_id, seller_name, ...
deals       — id, product_id, seller_id, target_quantity, current_quantity, price_per_unit, start_time, end_time, status (Active|Successful|Failed)
orders      — id, user_id, deal_id, quantity, total_amount, payment_status (Pending|Captured|Cancelled)
```

## Authentication & Roles

- JWT tokens stored in `localStorage` as `smart_deals_token`
- Token payload: `sub` (user id), `email`, `role`
- **Supplier**: can create products and deals
- **Consumer**: can browse and join deals

## Seed Accounts

| Role     | Email                      | Password     |
|----------|----------------------------|--------------|
| Supplier | supplier@smartdeals.kw     | Supplier123  |
| Consumer | consumer@smartdeals.kw     | Consumer123  |

Re-run seed: `python -m backend.seed`

## Seed Data

- 51 Kuwait supermarket products (rice, oil, water, milk, eggs, frozen food, snacks, cleaning supplies...)
- 20 group deals with varying prices and deadlines
- 12 sample orders (3 deals marked Successful)

## Currency

- Kuwaiti Dinar (KWD / د.ك)
- 3 decimal places (e.g. `8.500 KWD`)

## API Endpoints

```
POST  /api/auth/register         — Register (returns JWT + user)
POST  /api/auth/login            — Login
GET   /api/auth/me               — Current user (Bearer token)

GET   /api/products              — All products
GET   /api/products/my-products  — Supplier's products (auth)
POST  /api/products              — Create product (supplier only)
DELETE /api/products/:id         — Delete product (supplier only)

GET   /api/deals                 — All deals (?status=Active|Successful|Failed)
GET   /api/deals/my-deals        — Supplier's deals (auth)
GET   /api/deals/:id             — Deal detail
POST  /api/deals                 — Create deal (supplier only)

POST  /api/orders                — Join a deal (consumer only)
GET   /api/orders/my-orders      — Consumer's order history (auth)

GET   /api/search?q=             — Search deals by name, category, brand
GET   /api/latest-deals          — 6 most recent Active deals (home page)
```

## Business Logic

1. **Join Deal**: consumer selects qty → order created → `current_quantity += qty`
2. **Deal Success**: if `current_quantity >= target_quantity` → status = Successful → all orders = Captured
3. **Deal Failure**: scheduler runs every minute → if `now >= end_time` AND target not met → status = Failed → orders = Cancelled
4. **Background Scheduler**: APScheduler checks all Active deals every 60 seconds

## Frontend Pages & Routes

| Path              | Component     | Access           |
|-------------------|---------------|------------------|
| `/`               | Home          | Public           |
| `/deals`          | AllDeals      | Public           |
| `/deals/:id`      | DealDetail    | Public           |
| `/signup`         | SignUp        | Public           |
| `/login`          | Login         | Public           |
| `/my-products`    | MyProduct     | Supplier only    |
| `/my-deals`       | MyDeals       | Supplier only    |
| `/create-product` | CreatedProduct| Supplier only    |
| `/create-deal`    | CreateDeal    | Supplier only    |
| `/my-orders`      | MyOrders      | Consumer only    |
