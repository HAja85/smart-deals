# Smart Deals Client

A React + Vite single-page application with a FastAPI + PostgreSQL backend.

## Architecture

### Frontend (React + Vite)
- **React 19** with React Router 7
- **Vite 7** as the build tool
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **Axios** for HTTP requests
- **React Toastify** + **SweetAlert2** for notifications
- Runs on port **5000**, proxies `/api` requests to the backend

### Backend (FastAPI + PostgreSQL)
- **FastAPI** REST API
- **PostgreSQL** (Replit built-in) for data storage
- **JWT authentication** (python-jose + passlib/bcrypt)
- **psycopg2** for database connectivity
- Runs on port **8000**

## Project Structure

```
backend/
  main.py           - FastAPI app entry point, CORS, startup
  database.py       - PostgreSQL connection + schema initialization
  auth.py           - JWT token utilities + password hashing
  routers/
    auth_router.py  - /api/auth/register, /api/auth/login, /api/auth/me
    products.py     - /api/products CRUD
    bids.py         - /api/bids CRUD

src/
  App.jsx           - Root component
  main.jsx          - Entry point
  context/
    AuthProvider.jsx - JWT-based auth context (no Firebase)
    AuthContext.jsx  - React context definition
  auth/             - Login + SignUp pages
  components/       - Shared UI components
  hooks/            - Custom React hooks
  layout/           - Layout components
  pages/            - Route pages (Home, AllProduct, ProductDetails, MyProduct, MyBids, CreatedProduct)
  routes/           - React Router configuration
```

## Running the App

Two workflows:
- **Start Backend**: `bash start_backend.sh` → FastAPI on port 8000
- **Start application**: `npm run dev` → Vite dev server on port 5000

## Database Schema

- **users**: id, name, email, password_hash, image, created_at
- **products**: id, title, category, price_min, price_max, condition, usage, image, seller_*, location, description, status, created_at
- **bids**: id, product_id, buyer_*, bid_price, contact, product_*, status, created_at

## Authentication

JWT-based auth stored in localStorage (`smart_deals_token`). The user object includes:
- `id`, `_id`, `name`, `displayName`, `email`, `image`, `photoURL`
- `accessToken` (JWT token)
- `getIdToken()` method (returns Promise resolving to token)

## API Endpoints

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user (Bearer token required)
- `GET /api/products` — List all products (optional `?email=` filter)
- `POST /api/products` — Create product (auth required)
- `GET /api/products/:id` — Get product by ID
- `DELETE /api/products/:id` — Delete product
- `GET /api/products/bids/:id` — Get bids for product (auth required)
- `GET /api/bids?email=` — Get user's bids (auth required)
- `POST /api/bids` — Place a bid (auth required)
- `DELETE /api/bids/:id` — Remove a bid
- `GET /api/latest-product` — Get 6 most recent products
