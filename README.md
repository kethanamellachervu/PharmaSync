# PharmaSync – Smart Pharmacy Inventory Management System

A clean, modern, and practical healthcare SaaS system simplified specifically for local and retail pharmacies. Built with React, TypeScript, Vite, Tailwind CSS, Node.js, and Express.

---

## 🏥 Key Features & Workflow

1. **Medical Store Branding:**
   - Default: **Sri Sai Medical & General Store**
   - Displayed prominently in the Dashboard Welcome section, Top Navigation Header, and Sidebar.
   - Configurable in the **Settings** page with instant live synchronization across the entire application.

2. **Practical Dashboard:**
   - 4 essential statistic cards:
     - **Total Medicines**
     - **Available Stock**
     - **Low Stock Medicines**
     - **Today's Sales**
   - **Quick Actions:** "Add Medicine", "Record Sale", "View Inventory"
   - **Inventory Alerts:** Real-time warnings for medicines below minimum safety stock and medicines nearing expiry, with direct links to manage them in inventory.
   - **Recent Sales:** Live table of recent counter sales transactions.

3. **Medicine Inventory (`/inventory`):**
   - Add new medicine with initial batch, price, minimum alert threshold, and expiry date.
   - Edit medicine details, adjust pricing, and add additional batches.
   - Delete medicines with confirmation.
   - Search by medicine name, category, or batch number.
   - Quick filters: **All Items**, **Low Stock**, **Near Expiry**.

4. **Point of Sale Counter (`/sales`):**
   - Fast counter checkout interface.
   - Live available stock indicator.
   - **FEFO (First-Expired, First-Out) Priority:** Automatically identifies and deducts stock from batches with the earliest expiration dates first.
   - Prevents sales exceeding available stock.
   - Instant stock deduction reflected in the dashboard and inventory.

5. **Store Settings (`/settings`):**
   - Edit Medical Shop Name.
   - Edit Pharmacist / Store Admin title.
   - Configure Near-Expiry Alert threshold in days (default: 60 days).

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6, Axios
- **Backend:** Node.js, Express.js, TypeScript
- **Database Readiness:** Supabase client configured for future database migrations
- **Architecture:** Clean modular controllers, services, and route handlers

---

## 🚀 Running Locally

### 1. Start Backend API Server
```bash
cd backend
npm run dev
```
- API Server: `http://localhost:5000`
- Health Endpoint: `http://localhost:5000/api/health`

### 2. Start Frontend Application
```bash
cd frontend
npm run dev
```
- App: `http://localhost:5173`
