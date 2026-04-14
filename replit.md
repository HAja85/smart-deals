# Smart Deals Client

A React + Vite single-page application migrated from Vercel to Replit.

## Tech Stack

- **React 19** with React Router 7
- **Vite 7** as the build tool
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **Firebase** for authentication/backend services
- **Axios** for HTTP requests
- **React Toastify** + **SweetAlert2** for notifications

## Project Structure

```
src/
  App.jsx        - Root component
  main.jsx       - Entry point
  assets/        - Static assets
  auth/          - Authentication pages/logic
  components/    - Shared UI components
  context/       - React context providers
  firebase/      - Firebase configuration
  hooks/         - Custom React hooks
  layout/        - Layout components
  pages/         - Route pages
  routes/        - React Router configuration
```

## Running the App

The app runs on port 5000 via the "Start application" workflow using `npm run dev`.

## Notes

- Vite is configured with `host: '0.0.0.0'` and `port: 5000` for Replit compatibility
- `allowedHosts: true` is set to allow Replit's proxy
- The `vercel.json` rewrite rules are handled natively by Vite's SPA fallback in dev mode
