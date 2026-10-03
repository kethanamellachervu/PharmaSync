-- ==============================================================================
-- PharmaSync – Phase 2: Complete Pharmacy Inventory Database Schema
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

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_medicines_name ON public.medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON public.medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry ON public.medicine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine_id ON public.stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- 5. AUTO-UPDATE TIMESTAMP FUNCTION & TRIGGER
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
