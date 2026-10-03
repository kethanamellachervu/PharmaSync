# PharmaSync – Smart Pharmacy Inventory Management System

A clean, modern, and practical healthcare SaaS system designed specifically for local and retail pharmacies. Built with React, TypeScript, Vite, Tailwind CSS, Node.js, Express, and Supabase.

---

## 🏗️ Phase 2: Complete Pharmacy Inventory Management

Phase 2 introduces comprehensive medicine inventory, multi-batch tracking, strict First-Expiry First-Out (FEFO) stock logic, stock movement auditing, and Supabase database readiness.

### 1. Key Features Implemented

- **Comprehensive Inventory Table (`/inventory`):**
  - Search by medicine name, generic name, category, or ID.
  - Filter by category and stock status (**All Items**, **In Stock**, **Low Stock**, **Near Expiry**, **Expired**, **Out of Stock**).
  - Sort by **Name**, **Quantity**, or **Expiry Date** (ascending/descending).
  - Clean pagination (8 items/page) with intuitive navigation.
  - Columns: Medicine Name, Category, Available Quantity, Unit, Selling Price, Batch Number, Expiry Date, Stock Status, Actions.

- **Add & Edit Medicine Modals:**
  - Full pharmaceutical fields: Medicine Name, Generic Name, Category, Manufacturer, Description, Unit, Min. Stock Level, Selling Price, Purchase Price.
  - Initial batch details: Batch Number, Quantity, Mfg Date, Expiry Date.
  - Validations: Positive selling price, non-negative quantity & minimum stock, valid expiry date, and strict validation requiring expiry date to be later than manufacturing date.

- **Multi-Batch Management:**
  - Independent batch tracking with unique batch numbers per medicine.
  - View all batches belonging to any medicine.
  - Register new batches with distinct expiration dates and quantities.
  - Edit batch quantities or dates with automatic stock movement audit logging.
  - Prevents duplicate batch records for the same medicine.

- **Stock Status Alerts:**
  - **Low Stock:** Alerts when usable stock is at or below the minimum safety stock level.
  - **Near Expiry:** Identifies batches expiring within the next 30 days.
  - **Expired Batches:** Clearly flags expired batches and **excludes them from usable stock calculations**.
  - **Out of Stock:** Identifies medicines with zero usable units on shelves.

- **First-Expiry, First-Out (FEFO) Logic:**
  - Automatically identifies and allocates batches with the earliest expiry dates first.
  - Completely skips expired batches and zero-quantity batches.
  - Supports splitting transactions across multiple batches when needed.
  - Interactive **FEFO Simulation Engine** on the inventory page allows the pharmacist to preview exact allocation paths.

- **Stock Movement History:**
  - Complete audit trail of all inventory modifications.
  - Tracks `Stock Added` (intakes/deliveries), `Stock Removed` (dispensing/sales), and `Adjustment` (audit corrections).
  - Logs date/time, medicine, batch number, delta quantity, and operational reason.

- **Supabase PostgreSQL Schema & Integration:**
  - SQL schema in `supabase/schema.sql` (`medicines`, `medicine_batches`, `stock_movements`).
  - Realistic demonstration seed script in `supabase/seed.sql`.
  - Backend integration service with connection health check and schema validation reporting.

---

## 🗄️ Supabase PostgreSQL Database Setup

### Step 1: Run Schema Script
Open your [Supabase Dashboard](https://supabase.com), navigate to the **SQL Editor**, and execute:
```sql
-- Located at: supabase/schema.sql
```

### Step 2: (Optional) Seed Sample Data
In the **SQL Editor**, execute:
```sql
-- Located at: supabase/seed.sql
```

### Step 3: Configure Backend Environment
Add your project credentials to `backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

*Note:* If Supabase credentials are not provided, the backend operates in an in-memory repository mode, enabling testing with zero configuration.

---

## 🚀 Running Locally

### Backend Server
```bash
cd backend
npm install
npm run dev
```
- Server: `http://localhost:5000`
- Endpoints:
  - `GET /api/inventory` — List all medicines with batches and stock calculations
  - `POST /api/inventory` — Add new medicine with initial batch
  - `GET /api/inventory/:id` — Fetch single medicine details
  - `PUT /api/inventory/:id` — Update medicine details
  - `DELETE /api/inventory/:id` — Delete medicine with cascading batches
  - `GET /api/inventory/:id/batches` — List batches for medicine
  - `POST /api/inventory/:id/batches` — Add batch to existing medicine
  - `PUT /api/inventory/:id/batches/:batchId` — Update batch or adjust stock
  - `GET /api/inventory/movements` — View audit movement history
  - `GET /api/inventory/alerts` — Stock alerts (low stock, near expiry, expired, out of stock)
  - `POST /api/inventory/fefo-allocate` — Reusable FEFO stock allocation engine
  - `GET /api/inventory/database-status` — Supabase connection and table check

### Frontend Application
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`
- Navigation:
  - `/` — Pharmacy Overview Dashboard
  - `/inventory` — Complete Inventory Management & Batches
  - `/sales` — Point of Sale & Counter Checkout
  - `/settings` — Pharmacy Store Name & Configuration
