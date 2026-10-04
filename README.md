# PharmaSync – Smart Pharmacy Inventory Management & AI Forecasting System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38b2ac.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)

A modern healthcare SaaS platform designed specifically for community and retail pharmacies. **PharmaSync** streamlines multi-batch pharmaceutical inventory, enforces strict First-Expiry First-Out (FEFO) dispensing, automates purchase intakes, delivers real-time business intelligence, and leverages explainable AI time-series forecasting to guide restocking decisions.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [Project Directory Structure](#-project-directory-structure)
4. [Prerequisites & Quickstart](#-prerequisites--quickstart)
5. [Environment Variables](#-environment-variables)
6. [Supabase Database Setup & Schema](#-supabase-database-setup--schema)
7. [Core Workflows Explained](#-core-workflows-explained)
8. [Security & Optimization Implementations](#-security--optimization-implementations)
9. [Automated Verification & Testing](#-automated-verification--testing)
10. [Production Deployment Guide](#-production-deployment-guide)
11. [Known Limitations & Prototype Boundaries](#-known-limitations--prototype-boundaries)

---

## 📖 Project Overview

PharmaSync is a modern pharmacy inventory management system with AI‑driven demand forecasting. It provides a responsive React UI, a robust Node/Express API, and optional Supabase PostgreSQL storage. Core features include batch tracking with FEFO allocation, sales processing with idempotency, supplier & purchase management, dashboard analytics, and AI‑based reorder suggestions. The system follows best‑practice security headers, rate limiting, and automated testing.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide React, Recharts |
| **Build & Tooling** | Vite 5 (Rollup code-splitting, manual vendor chunks) |
| **Backend API** | Node.js, Express 4, TypeScript, tsx, CORS |
| **Database** | PostgreSQL via Supabase (UUIDs, Triggers, FK Constraints, Indexes) |
| **Algorithms** | Weighted Moving Average (WMA), Trend Slope Analysis, FEFO Queue |

---

## 📁 Project Directory Structure

```text
smart-pharmacy/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment validation and credentials
│   │   ├── controllers/        # Express handlers (inventory, sales, forecast, reports...)
│   │   ├── middleware/         # Security headers, rate limiting, logging, error handler
│   │   ├── routes/             # REST routing modules
│   │   ├── services/           # Business logic (pharmacyStore, forecastingService, supabaseService)
│   │   ├── app.ts              # Express application factory & middleware pipeline
│   │   └── server.ts           # HTTP server bootstrap
│   ├── dist/                   # Production compiled JavaScript
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI widgets, Sidebar, StatCards, ErrorBoundary
│   │   ├── pages/              # Lazy-loaded route views (Inventory, Sales, Forecasting, Reorder...)
│   │   ├── services/           # Typed API HTTP client
│   │   ├── types/              # Domain interfaces and type contracts
│   │   ├── App.tsx             # Root router with Suspense and ErrorBoundary
│   │   └── main.tsx            # DOM root
│   ├── dist/                   # Minified production distribution bundle
│   ├── vite.config.ts          # Rollup chunk optimization
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── supabase/
│   ├── schema.sql              # Complete PostgreSQL DDL (13 tables, triggers, indexes)
│   └── seed.sql                # Demonstration data seed script
└── README.md                   # System documentation
```

---

## ⚡ Prerequisites & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd smart-pharmacy

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Files
```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

### 3. Run in Development Mode
Open two terminal tabs:

**Tab 1: Backend API Server**
```bash
cd backend
npm run dev
# Starts server on http://localhost:5000
```

**Tab 2: Frontend Client**
```bash
cd frontend
npm run dev
# Launches Vite dev server on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express HTTP server |
| `FRONTEND_URL` | `http://localhost:5173` | Primary allowed origin for CORS requests |
| `ADDITIONAL_ALLOWED_ORIGINS` | *None* | Comma-separated list of additional allowed origins for staging/prod |
| `SUPABASE_URL` | *Empty* | Supabase project URL (`https://your-id.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | *Empty* | Supabase service role secret (kept server-side only) |

### Frontend (`frontend/.env`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL used by the frontend Axios/Fetch client |

> 🔒 **Security Notice:** No database connection strings, passwords, or Supabase service keys are ever defined or referenced in the frontend environment.

---

## 🗄️ Supabase Database Setup & Schema

If you wish to use Supabase cloud storage instead of the built-in in-memory store:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of [`supabase/schema.sql`](file:///c:/Users/ketha/smart-pharmacy/supabase/schema.sql).
4. Run [`supabase/seed.sql`](file:///c:/Users/ketha/smart-pharmacy/supabase/seed.sql) to populate initial inventory and sales data.
5. In your Supabase Dashboard, go to **Settings > API** to retrieve your `URL` and `service_role` key.
6. Populate `backend/.env` with these values and restart the backend server.

---

## 🔄 Core Workflows Explained

### 1. Inventory & FEFO Allocation
- Every medicine has one or more batches with unique batch numbers and expiration dates.
- Usable stock is calculated exclusively from non-expired batches.
- Batches expiring within 30 days are flagged with amber badges.
- When an order is processed, the system automatically pulls from the batch expiring soonest (**FEFO - First Expiry, First Out**).

### 2. Point of Sale & Idempotent Checkout
- Pharmacists can build a multi-item cart.
- At checkout, each item is validated against available usable stock across non-expired batches.
- The request includes an `idempotencyKey` preventing accidental double-billing if the user double-clicks submit.
- Stock is atomically updated and an audit entry is created in `stock_movements`.

### 3. Purchases & Inward Stock
- Purchasing logs supplier details, incoming batch numbers, costs, and expiration dates.
- The engine checks for duplicate batch numbers with conflicting expiration dates to prevent data contamination.
- Once submitted, inventory usable quantities update immediately.

### 4. AI Demand Forecasting & Smart Reorder
- **Weighted Moving Average (WMA):**
  $$\text{Demand Rate} = 0.50 \cdot R_7 + 0.35 \cdot R_{14} + 0.15 \cdot R_{30}$$
- **Deduction of Batches Expiring in Horizon:**
  Stock expiring during the selected planning period is subtracted from reliable inventory.
- **Safety Stock Buffer:**
  $$\text{Safety Buffer} = \max\left(\text{minStockLevel}, \lceil \text{Daily Demand} \times \text{Buffer Days} \rceil\right)$$
- **Suggested Reorder Quantity:**
  $$\text{Reorder Quantity} = \max\left(0, \lceil \text{Forecast Demand} + \text{Safety Buffer} - \text{Reliable Stock} \rceil\right)$$
- Recommendations are presented for pharmacist review (`pending`, `reviewed`, `dismissed`). A reviewed recommendation does not automatically generate a financial order.

---

## 🛡️ Security & Optimization Implementations

* **OWASP Security Headers**: Custom middleware adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, and removes `X-Powered-By`.
* **In-Memory Rate Limiting**:
  - Global API: 1,000 requests per 15-minute window per IP.
  - State mutations (POST/PUT/DELETE/PATCH): 150 requests per minute per IP.
* **Safe Production Error Handling**: Stack traces and raw internal error details are stripped when `NODE_ENV=production`.
* **Client-Side Code-Splitting**: All major views (`ForecastingPage`, `InventoryPage`, `ReportsPage`, etc.) are lazy-loaded via `React.lazy` and `Suspense`, preventing large upfront bundle downloads.
* **Vendor Bundle Optimization**: Heavy third-party libraries (e.g., Recharts) are isolated into dedicated cacheable chunks (`vendor-charts.js`), bringing individual page chunks down to 4–46 kB.
* **React Error Boundary**: Catches unhandled UI exceptions and renders an informative recovery card rather than crashing to a blank screen.

---

## 🧪 Automated Verification & Testing

PharmaSync includes an automated verification script that executes 7 test suites validating all API endpoints, database operations, calculations, and security constraints.

### Running the Automated Test Suite
Ensure the backend server is running on port 5000, then execute:
```bash
node scratch/test_phase6_complete.js
```

### Verified Test Suites
1. **Health Endpoints & Security Headers**: Validates root `/health`, `/api/health`, standard security headers, rate limit headers, and 404 handlers.
2. **Inventory Lifecycle & Validation**: Verifies rejection of invalid fields, creation of medicines, multi-batch additions, and usable stock calculations.
3. **Sales, FEFO Allocation & Idempotency**: Verifies FEFO batch deduction order, duplicate submission rejection via idempotency keys, and over-selling prevention.
4. **Suppliers & Purchases**: Verifies supplier creation, inward batch additions, stock increments, and rejection of conflicting batch dates.
5. **Dashboard Analytics & Reports**: Verifies summary statistics, filtered sales reports, inventory valuations, and CSV exports.
6. **AI Demand Forecasting & Reorder**: Verifies 7d/30d/90d horizons, low-confidence handling for sparse sales, reorder math, and settings persistence.
7. **Bundle Secret Exposure Audit**: Scans minified production JavaScript chunks to ensure zero exposure of private keys, database passwords, or service role secrets.

---

## 🚢 Production Deployment Guide

### 1. Build Production Assets
```bash
# Build Backend
cd backend
npm run build
# Output generated in backend/dist/

# Build Frontend
cd ../frontend
npm run build
# Output generated in frontend/dist/
```

### 2. Run Backend in Production
```bash
cd backend
NODE_ENV=production PORT=5000 node dist/server.js
```

### 3. Deploy to Cloud Providers

#### Option A: Containerized / Cloud VM (Docker, Render, Railway, AWS ECS)
- Expose port `5000`.
- Health check path: `GET /health` or `GET /api/health`.
- Set environment variables `PORT`, `FRONTEND_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.

#### Option B: Frontend Static Hosting (Vercel, Netlify, Cloudflare Pages, S3/CloudFront)
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Configure Single Page Application (SPA) redirect rewrite: all routes `/*` rewritten to `/index.html`.
- Environment variable: `VITE_API_BASE_URL=https://your-backend-api.example.com/api`.

---

## ⚠️ Known Limitations & Prototype Boundaries

1. **In-Memory Store Mode:** If Supabase credentials are left empty in `backend/.env`, the system defaults to an in-memory repository. Any newly added records or status updates will reset if the backend server process is restarted.
2. **Authentication:** The prototype does not include a multi-tenant user authentication system (RBAC). In accordance with project instructions, authentication has not been mocked or simulated.
3. **Out of Scope Modules:** As specified in the design requirements, the system does not perform OCR invoice scanning, automatic banking payments, or patient diagnosis. Reorder recommendations are advisory tools for licensed pharmacists.
