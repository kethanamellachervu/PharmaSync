# Smart Pharmacy Inventory and Demand Forecasting System

A commercial-grade, modern healthcare SaaS dashboard designed for pharmaceutical inventory management, real-time stock alerting, prescription tracking, and AI-driven demand forecasting.

---

## 🏗️ Phase 1 Architecture Overview

This project is built as a modular, decoupled full-stack architecture:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 + Lucide Icons + Recharts
- **Backend:** Node.js (v24) + Express.js + TypeScript + Supabase Client (`@supabase/supabase-js`)
- **Database:** Supabase (PostgreSQL) - Configured for Phase 2+ data migration
- **Communication:** Axios REST API client with environment-driven base URLs and connection health monitors

```text
smart-pharmacy/
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   └── ConnectionBadge.tsx
│   │   │   └── dashboard/
│   │   │       ├── WelcomeBanner.tsx
│   │   │       ├── SalesChart.tsx
│   │   │       ├── CategoryDistributionChart.tsx
│   │   │       ├── InventoryAlerts.tsx
│   │   │       └── RecentActivity.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── PlaceholderPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   │   └── useBackendHealth.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── layouts/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── .env.example
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── supabase.ts
│   │   ├── controllers/
│   │   │   └── healthController.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── requestLogger.ts
│   │   ├── routes/
│   │   │   ├── healthRoutes.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## 🔄 How React, Express, and Supabase Work Together

1. **Client Tier (React + Vite):**
   - The browser connects to the React SPA on port `5173`.
   - The frontend reads `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`) without hardcoding endpoints.
   - A dedicated `useBackendHealth` hook monitors backend availability and database readiness status in real time.
   - The dashboard displays key metrics, weekly revenue charts, therapeutic category distribution, low-stock/expiry action alerts, and recent dispensations.

2. **Server Tier (Node.js + Express):**
   - The Express application runs on port `5000`.
   - Incoming requests pass through `requestLogger` for latency and status tracking, followed by CORS protection configured specifically for the frontend.
   - Routes are separated from server bootstrap (`app.ts` vs `server.ts`) for modularity and testability.
   - Centralized `errorHandler` catches unhandled exceptions and returns standardized JSON errors.
   - Provides `GET /api/health` providing service telemetry and Supabase integration readiness.

3. **Data Tier (Supabase):**
   - The backend includes the Supabase client wrapper (`backend/src/config/supabase.ts`) configured via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Service keys remain isolated on the backend server and are never leaked to client bundles.
   - If Supabase environment variables are unset, the server starts gracefully and reports `supabase: { configured: false }` rather than failing, ready for Phase 2 database schema setup.

---

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js >= 18 (Tested on v24.11)
- npm >= 9 (Tested on 11.6)

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server will start at:
- **Server:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/api/health`

### 2. Frontend Setup

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will start at:
- **Dashboard:** `http://localhost:5173`

---

## ⚙️ Environment Variables

### `backend/.env`
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### `frontend/.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📋 Development Roadmap

- [x] **Phase 1: Project Setup, Architecture & UI Shell** (Completed)
- [ ] **Phase 2:** Medicine Inventory, Batch & Expiry Management, Supabase Schema
- [ ] **Phase 3:** Sales Counter, Point of Sale (POS) & Supplier Procurement
- [ ] **Phase 4:** Analytics, Financial Reports, Turnover & Expiry Loss Auditing
- [ ] **Phase 5:** AI-Powered Demand Forecasting & Smart Auto-Reordering
- [ ] **Phase 6:** Multi-Role Access Control, Barcode/QR Scanning & Cloud Deployment
