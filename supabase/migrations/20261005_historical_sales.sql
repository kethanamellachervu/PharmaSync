-- ==============================================================================
-- PharmaSync – Phase 5: Historical Forecasting Sales Table Migration
-- Compatible with Supabase PostgreSQL
-- ==============================================================================

-- 14. HISTORICAL SALES TABLE (SYNTHETIC HISTORICAL DATA FOR ML FORECASTING)
-- Strictly separated from live inventory and counter sales
CREATE TABLE IF NOT EXISTS public.historical_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    medicine_id VARCHAR(100) NOT NULL,
    matched_medicine_uuid UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    units_sold INTEGER NOT NULL CHECK (units_sold >= 0),
    stock_received INTEGER NOT NULL DEFAULT 0 CHECK (stock_received >= 0),
    closing_stock INTEGER NOT NULL DEFAULT 0,
    supplier_lead_time_days INTEGER DEFAULT 7,
    reorder_level INTEGER DEFAULT 50,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    day_of_week VARCHAR(20) NOT NULL,
    is_weekend INTEGER NOT NULL DEFAULT 0 CHECK (is_weekend IN (0, 1)),
    sales_7d_avg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    sales_30d_avg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_historical_sales_date_med UNIQUE (date, medicine_id)
);

-- Performance Indexes for fast time-series aggregation and ML feature generation
CREATE INDEX IF NOT EXISTS idx_historical_sales_med_date ON public.historical_sales(medicine_id, date);
CREATE INDEX IF NOT EXISTS idx_historical_sales_date ON public.historical_sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_sales_matched_uuid ON public.historical_sales(matched_medicine_uuid);

COMMENT ON TABLE public.historical_sales IS 'Historical synthetic sales data for ML Demand Forecasting model training. Not current stock.';
