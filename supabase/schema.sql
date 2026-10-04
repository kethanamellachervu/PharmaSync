-- ==============================================================================
-- PharmaSync – Phase 3: Sales, Suppliers and Purchase Management Schema
-- Compatible with Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MEDICINES TABLE
-- Master catalog of pharmaceutical products
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'tablets',
    min_stock_level INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_level >= 0),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price > 0),
    purchase_price NUMERIC(10, 2) CHECK (purchase_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MEDICINE BATCHES TABLE
-- Tracks individual batches, expiration dates, and physical quantities
CREATE TABLE IF NOT EXISTS public.medicine_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    mfg_date DATE,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_medicine_batch UNIQUE (medicine_id, batch_number),
    CONSTRAINT chk_mfg_before_expiry CHECK (mfg_date IS NULL OR expiry_date > mfg_date)
);

-- 3. STOCK MOVEMENTS TABLE
-- Audit log of all stock increases, sales deductions, and inventory adjustments
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('Stock Added', 'Stock Removed', 'Adjustment')),
    quantity INTEGER NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SUPPLIERS TABLE
-- Commercial vendors, manufacturers, and distributors supplying medicines
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PURCHASES TABLE
-- Inward purchase orders / stock invoices from suppliers
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PURCHASE ITEMS TABLE
-- Individual medicine lines, received batch details, and costs within a purchase
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(10, 2) NOT NULL CHECK (purchase_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    expiry_date DATE NOT NULL,
    mfg_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SALES TABLE
-- Counter sales transactions / patient prescriptions dispensed
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    total_items INTEGER NOT NULL CHECK (total_items > 0),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SALE ITEMS TABLE
-- Individual medicine lines within a sale
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
    medicine_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'tablets',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SALE BATCH ALLOCATIONS TABLE
-- Records exact FEFO batch deductions for each line item in a sale
CREATE TABLE IF NOT EXISTS public.sale_batch_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_medicines_name ON public.medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON public.medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry ON public.medicine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine_id ON public.stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_batch_allocations_sale_item_id ON public.sale_batch_allocations(sale_item_id);

-- 11. AUTO-UPDATE TIMESTAMP FUNCTION & TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_medicines_updated_at ON public.medicines;
CREATE TRIGGER trigger_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_medicine_batches_updated_at ON public.medicine_batches;
CREATE TRIGGER trigger_medicine_batches_updated_at
BEFORE UPDATE ON public.medicine_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- PHASE 4 & 5: SETTINGS, AI DEMAND FORECASTING & REORDERING TABLES
-- ==============================================================================

-- 12. SHOP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name VARCHAR(255) NOT NULL DEFAULT 'Sri Sai Medical & General Store',
    pharmacist_name VARCHAR(255) NOT NULL DEFAULT 'Store Pharmacist',
    near_expiry_days INTEGER NOT NULL DEFAULT 30 CHECK (near_expiry_days > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_shop_settings_updated_at ON public.shop_settings;
CREATE TRIGGER trigger_shop_settings_updated_at
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. FORECAST SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.forecast_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    default_horizon_days INTEGER NOT NULL DEFAULT 30 CHECK (default_horizon_days IN (7, 30, 90)),
    safety_buffer_days INTEGER NOT NULL DEFAULT 5 CHECK (safety_buffer_days >= 0),
    min_data_days_required INTEGER NOT NULL DEFAULT 7 CHECK (min_data_days_required >= 1),
    method VARCHAR(50) NOT NULL DEFAULT 'weighted_moving_average' CHECK (method IN ('weighted_moving_average', 'simple_moving_average', 'trend_adjusted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. REORDER RECOMMENDATION REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reorder_recommendation_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'dismissed')),
    suggested_quantity INTEGER NOT NULL CHECK (suggested_quantity >= 0),
    adjusted_quantity INTEGER CHECK (adjusted_quantity IS NULL OR adjusted_quantity >= 0),
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_medicine_reorder_review UNIQUE (medicine_id)
);

CREATE INDEX IF NOT EXISTS idx_reorder_reviews_status ON public.reorder_recommendation_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_reorder_reviews_medicine_id ON public.reorder_recommendation_reviews(medicine_id);

DROP TRIGGER IF EXISTS trigger_forecast_settings_updated_at ON public.forecast_settings;
CREATE TRIGGER trigger_forecast_settings_updated_at
BEFORE UPDATE ON public.forecast_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reorder_reviews_updated_at ON public.reorder_recommendation_reviews;
CREATE TRIGGER trigger_reorder_reviews_updated_at
BEFORE UPDATE ON public.reorder_recommendation_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
