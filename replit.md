# SmartDeals Kuwait

Kuwait's group-buying marketplace for supermarket essentials. Built with React + Vite frontend, FastAPI + PostgreSQL backend, and a React Native (Expo) mobile app.

## Recent Additions
- **Mobile App (Task #2)**: Full Expo SDK 52 React Native app at `/mobile`. Auth (login/3-step signup), consumer tabs (Home, Deals, Cart, Orders, Profile), supplier tabs (Home, Products, Deals, Orders, Dashboard), push notifications, JWT in SecureStore, DealCard with live countdown + progress bar.
- **Image Upload**: `POST /api/upload` endpoint (FastAPI, max 5 MB, JPG/PNG/WebP/GIF). Uploaded files stored in `/uploads/`, served as static files via `/uploads/<filename>`. Reusable `ImageUploader` component with drag-and-drop + file browse + paste URL tabs.
- **Signup profile image**: uses `ImageUploader` instead of plain URL field
- **Create Product image**: uses `ImageUploader` instead of plain URL field
- **Redesigned Hero**: dark gradient (navy → teal), amber/gold accent colors, animated counter stats, category quick-filter chips, wave divider
- **Enhanced Deal Cards**: hot/almost-full badges (fire icon), amber savings badge, coloured progress bar, hover lift animation

## Architecture

### Mobile App (React Native + Expo)
- **Expo SDK 52** / **React Native 0.76** / **expo-router 4** (file-based routing)
- **Port 8080** — Metro bundler serves Expo Web; QR code for Expo Go on physical devices
- **Brand**: primary `#34699A` (Kuwait blue), accent `#F59E0B` (amber)
- **JWT** stored in `expo-secure-store` (native) / `localStorage` (web)
- **Axios** service with automatic JWT injection and 401 logout
- **@tanstack/react-query** for data fetching/caching
- **Push notifications** via `expo-notifications` (registered on login, unregistered on logout)
- **API URL**: `EXPO_PUBLIC_API_URL=https://$REPLIT_DEV_DOMAIN/api` (set in workflow, passes through Vite proxy)

#### Mobile App Structure
```
mobile/
  app/
    _layout.tsx          — Root: providers + auth gate (redirects by role)
    index.tsx            — Redirect to /(auth)/login
    (auth)/login.tsx     — Email + password login + demo credentials box
    (auth)/signup.tsx    — 3-step: info → email OTP → mobile OTP
    (consumer)/          — Tabs: Home, Deals, Cart, Orders, Profile
    (supplier)/          — Tabs: Home, Products, Deals, Orders, Dashboard
  components/
    DealCard.tsx         — Deal card: image, price, progress bar, countdown, badges
    ui.tsx               — InputField, PrimaryButton, EmptyState, ScreenHeader
  hooks/
    useAuth.tsx          — Auth context: login/logout/refreshUser, push token mgmt
    useColors.ts         — Color scheme hook
  services/api.ts        — Axios instance, token storage, 401 interceptor
  constants/colors.ts    — Brand color palette
```

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

Three workflows:
- **Start Backend**: `bash start_backend.sh` → FastAPI on port 8000
- **Start application**: `npm run dev` → Vite on port 5000
- **Start Mobile App**: `cd mobile && EXPO_PUBLIC_API_URL=https://$REPLIT_DEV_DOMAIN/api npx expo start --web --port 8080`

## Database Schema

```sql
users       — id, name, email, password_hash, image, role (supplier|consumer), created_at
products    — id, title, category, brand, unit, description, image, seller_id, seller_name, ...
deals       — id, product_id, seller_id, target_quantity, current_quantity, price_per_unit, start_time, end_time, status (Active|Successful|Failed), view_count
orders      — id, user_id, deal_id, quantity, total_amount, payment_status (Pending|Captured|Cancelled), delivery_status
cart_items  — id, user_id, deal_id, quantity, added_at
push_tokens — id, user_id, token, platform, created_at
```

## Authentication & Roles

- JWT tokens stored in `localStorage` as `smart_deals_token` (web) / `expo-secure-store` (native)
- Token payload: `sub` (user id), `email`, `role`
- **Supplier**: can create products and deals
- **Consumer**: can browse and join deals

## Seed Accounts

| Role     | Email                      | Password     |
|----------|----------------------------|--------------|
| Supplier | supplier@smartdeals.kw     | Supplier123  |
| Consumer | consumer@smartdeals.kw     | Consumer123  |
| Admin    | admin@smartdeals.kw        | Admin@123    |

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
POST  /api/auth/send-email-otp   — Send email OTP (returns otp in demo_mode)
POST  /api/auth/send-mobile-otp  — Send mobile OTP (returns otp in demo_mode)

GET   /api/products              — All products
GET   /api/products/my-products  — Supplier's products (auth)
POST  /api/products              — Create product (supplier only)
DELETE /api/products/:id         — Delete product (supplier only)

GET   /api/deals                 — All deals (?status=Active|Successful|Failed&limit&offset)
GET   /api/deals/my-deals        — Supplier's deals (auth)
GET   /api/deals/trending        — Top 10 Active deals by view count
GET   /api/deals/related/:id     — Up to 8 Active deals same category/brand
GET   /api/deals/:id             — Deal detail
POST  /api/deals                 — Create deal (supplier only)
POST  /api/deals/:id/view        — Increment view count (no auth)

POST  /api/orders                — Join a deal (consumer only)
GET   /api/orders/my-orders      — Consumer's order history (auth)
GET   /api/orders/supplier-orders— Supplier's orders with filters (auth)
GET   /api/orders/:id/invoice    — Download invoice PDF (consumer or supplier)
GET   /api/orders/:id/delivery-note — Download delivery note PDF (consumer or supplier)
PATCH /api/orders/:id/delivery-status — Update delivery status (supplier only)

GET   /api/cart                  — Consumer's cart (active deals only)
POST  /api/cart                  — Add/update deal in cart
PUT   /api/cart/:deal_id         — Update cart item quantity
DELETE /api/cart/:deal_id        — Remove deal from cart
DELETE /api/cart                 — Clear cart

POST  /api/push/register         — Register Expo push token
POST  /api/push/unregister       — Unregister push token

GET   /api/reports/supplier?from=YYYY-MM-DD&to=YYYY-MM-DD — Accounting report PDF

GET   /api/search?q=             — Search deals by name, category, brand
GET   /api/latest-deals          — 6 most recent Active deals (home page)
GET   /api/upcoming-deals        — 6 upcoming deals
```

## Mobile App Backend Extensions (Task #1)

- **cart_items** table: multi-deal shopping cart per consumer; expired deals auto-removed by scheduler
- **push_tokens** table: stores Expo push tokens; push sent on deal success/fail/delivery updates
- **PDF generation** (reportlab): Invoice, Delivery Note, Supplier Accounting Report
- **view_count** column on deals: incremented on each detail view; powers trending endpoint
- **Expo Push API**: used for push notifications (covers FCM + APNs natively)

## Business Logic

1. **Join Deal**: consumer selects qty → order created → `current_quantity += qty`
2. **Deal Success**: if `current_quantity >= target_quantity` → status = Successful → all orders = Captured
3. **Deal Failure**: scheduler runs every minute → if `now >= end_time` AND target not met → status = Failed → orders = Cancelled
4. **Background Scheduler**: APScheduler checks all Active deals every 60 seconds
5. **Cart Cleanup**: expired deals auto-removed from cart on every GET /api/cart request

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
