# PharmaSync: Supabase PostgreSQL Setup & Configuration Guide

PharmaSync has been migrated back to **Supabase PostgreSQL**. This guide details how to configure your Supabase project, execute the SQL schema migrations, populate seed data, and connect the backend.

---

## 1. Create a Supabase Project

1. Visit [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New project"**.
3. Enter project details:
   - **Name**: `pharmasync` (or your choice)
   - **Database Password**: Set a strong password (keep this safe)
   - **Region**: Choose the region closest to you
4. Click **"Create new project"** and wait ~2 minutes for provisioning to finish.

---

## 2. Run Database Schema Migration

1. In your Supabase project dashboard, navigate to **SQL Editor** (icon on the left sidebar: `>_`).
2. Click **"+ New Query"**.
3. Open the schema script from this repository:
   - File: `supabase/schema.sql`
4. Copy the entire contents of `supabase/schema.sql`, paste it into the Supabase SQL Editor, and click **"Run"** (or press `Ctrl+Enter`).
5. Verify that all 13 tables are created:
   - `medicines`
   - `medicine_batches`
   - `suppliers`
   - `stock_movements`
   - `purchases`
   - `purchase_items`
   - `sales`
   - `sale_items`
   - `sale_batch_allocations`
   - `shop_settings`
   - `forecast_settings`
   - `reorder_recommendation_reviews`
   - `idempotency_keys`

---

## 3. (Optional) Run Seed Data Migration

To populate your database with realistic demo inventory, supplier directories, batches, and historical sales:

1. In the Supabase **SQL Editor**, click **"+ New Query"**.
2. Open the seed script from this repository:
   - File: `supabase/seed.sql`
3. Copy the entire contents of `supabase/seed.sql`, paste it into the editor, and click **"Run"**.

---

## 4. Retrieve API Credentials

1. In the Supabase dashboard sidebar, go to **Project Settings** (gear icon) -> **API**.
2. Under **Project URL**, copy the `URL` (e.g. `https://xyzcompany.supabase.co`).
3. Under **Project API keys**, find:
   - `service_role` (secret) key: **Recommended for the backend**. This allows the backend service to perform administrative operations (inventory deduction, batch movements).
   - Alternatively, you can use the `anon` (public) key.

---

## 5. Configure Backend Environment

In `backend/.env`, set:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Supabase PostgreSQL Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> 🔒 **Security Notice**: Never commit `backend/.env` to source control. Keep `SUPABASE_SERVICE_ROLE_KEY` confidential.

---

## 6. Verify Database & APIs

Run the automated test suite to verify all 29 endpoints and Supabase connectivity:

```powershell
cd backend
npm run test:api
```

---

## 7. Starting the Application

### Start Backend
```powershell
cd backend
npm run dev
```
*Backend URL*: `http://localhost:5000`  
*Health Check*: `http://localhost:5000/api/health`  
*Database Status*: `http://localhost:5000/api/inventory/database-status`

### Start Frontend
```powershell
cd frontend
npm run dev
```
*Frontend URL*: `http://localhost:5173`

---

## 8. AI-Powered Purchase Bill Scanner Setup

The inventory and purchase modules feature automatic bill intake via OCR and Document AI.

### Recommended Engine: Google Gemini Vision
Google Gemini 3.8 Flash natively parses purchase invoice images (JPG, PNG, WEBP) and multi-page PDFs with structured item extraction.

1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add your key to `backend/.env`:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
3. (Optional) Alternatively, OpenAI Vision can be configured using `OPENAI_API_KEY`.
4. Test the OCR pipeline:
   ```powershell
   cd backend
   npm run test:ocr
   ```

*Note*: If no external API key is provided, the system seamlessly runs in local testing mode, supporting built-in sample purchase invoices and UI test fixtures with zero setup required.

