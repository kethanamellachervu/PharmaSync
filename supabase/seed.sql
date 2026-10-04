-- ==============================================================================
-- PharmaSync – Phase 3: Sample Pharmacy Data Seed Script
-- Realistic sample inventory, suppliers, purchases, and sales for retail pharmacies
-- ==============================================================================

DO $$
DECLARE
    med_pcm UUID;
    med_amox UUID;
    med_met UUID;
    med_panto UUID;
    med_cetz UUID;
    med_azith UUID;
    med_cough UUID;
    batch_id UUID;
    
    supp_medlife UUID;
    supp_apollo UUID;
    supp_bharat UUID;
    
    po_id UUID;
    sale_id UUID;
    item_id UUID;
BEGIN
    -- 1. MEDICINES
    -- 1.1 Paracetamol 500mg (Analgesics)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Paracetamol 500mg Tablets', 'Acetaminophen', 'Analgesics', 'Apex Healthcare', 'Standard antipyretic and analgesic for pain & fever relief.', 'tablets', 30, 15.00, 9.50)
    RETURNING id INTO med_pcm;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_pcm, 'PCM-B101', 60, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '18 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_pcm, batch_id, 'PCM-B101', 'Stock Added', 60, 'Initial wholesale delivery');

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_pcm, 'PCM-B102', 40, CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '22 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_pcm, batch_id, 'PCM-B102', 'Stock Added', 40, 'Routine replenishment');

    -- 1.2 Amoxicillin 500mg (Antibiotics - Near Expiry Alert within 30 days)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Amoxicillin 500mg Capsules', 'Amoxicillin Trihydrate', 'Antibiotics', 'Cipla Labs', 'Broad-spectrum penicillin antibiotic.', 'strips', 25, 65.00, 48.00)
    RETURNING id INTO med_amox;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_amox, 'AMX-204', 12, CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '20 days')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_amox, batch_id, 'AMX-204', 'Stock Added', 12, 'Secondary stock intake');

    -- 1.3 Metformin 500mg (Diabetes - Multi-batch: one near expiry, one healthy)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Metformin 500mg Tablets', 'Metformin Hydrochloride', 'Diabetes Care', 'Sun Pharma', 'First-line medication for type 2 diabetes management.', 'boxes', 40, 42.00, 29.00)
    RETURNING id INTO med_met;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_met, 'MET-332', 15, CURRENT_DATE - INTERVAL '10 months', CURRENT_DATE + INTERVAL '25 days')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_met, batch_id, 'MET-332', 'Stock Added', 15, 'Batch consignment A');

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_met, 'MET-333', 50, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '16 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_met, batch_id, 'MET-333', 'Stock Added', 50, 'Batch consignment B');

    -- 1.4 Pantoprazole 40mg (Antacids)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Pantoprazole 40mg Tablets', 'Pantoprazole Sodium', 'Antacids', 'Alkem Laboratories', 'Proton pump inhibitor for acid reflux and GERD.', 'strips', 20, 55.00, 36.00)
    RETURNING id INTO med_panto;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_panto, 'PAN-410', 35, CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '14 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_panto, batch_id, 'PAN-410', 'Stock Added', 35, 'Primary stock intake');

    -- 1.5 Cetirizine 10mg (Antihistamines - Low Stock Alert)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Cetirizine 10mg Tablets', 'Cetirizine Dihydrochloride', 'Antihistamines', 'Dr. Reddy Laboratories', 'Non-drowsy allergy and antihistamine medication.', 'strips', 25, 22.00, 14.50)
    RETURNING id INTO med_cetz;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_cetz, 'CTZ-512', 8, CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE + INTERVAL '12 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_cetz, batch_id, 'CTZ-512', 'Stock Added', 8, 'Low stock balance');

    -- 1.6 Azithromycin 500mg (Antibiotics)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Azithromycin 500mg Tablets', 'Azithromycin', 'Antibiotics', 'Zydus Cadila', 'Macrolide antibiotic for respiratory & bacterial infections.', 'strips', 15, 95.00, 68.00)
    RETURNING id INTO med_azith;

    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_azith, 'AZI-620', 28, CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '11 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_azith, batch_id, 'AZI-620', 'Stock Added', 28, 'Initial inventory');

    -- 1.7 Ascoril D Plus Syrup (Respiratory / Cough - Expired Batch demonstration)
    INSERT INTO public.medicines (name, generic_name, category, manufacturer, description, unit, min_stock_level, selling_price, purchase_price)
    VALUES ('Ascoril D Plus Cough Syrup', 'Dextromethorphan + Chlorpheniramine', 'Respiratory', 'Glenmark Pharma', 'Cough suppressant syrup for dry cough relief.', 'bottles', 15, 120.00, 85.00)
    RETURNING id INTO med_cough;

    -- Expired batch: quantity 10, expired 15 days ago (must be excluded from usable stock!)
    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_cough, 'ASC-EXP01', 10, CURRENT_DATE - INTERVAL '14 months', CURRENT_DATE - INTERVAL '15 days')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_cough, batch_id, 'ASC-EXP01', 'Stock Added', 10, 'Historical stock (Expired)');

    -- Fresh batch: quantity 20, valid
    INSERT INTO public.medicine_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
    VALUES (med_cough, 'ASC-FRESH02', 20, CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '18 months')
    RETURNING id INTO batch_id;
    INSERT INTO public.stock_movements (medicine_id, batch_id, batch_number, movement_type, quantity, reason)
    VALUES (med_cough, batch_id, 'ASC-FRESH02', 'Stock Added', 20, 'Fresh batch stock intake');

    -- 2. SUPPLIERS
    INSERT INTO public.suppliers (name, contact_person, phone, email, address)
    VALUES ('MedLife Pharma Distributors', 'Rajesh Sharma', '+91 98765 43210', 'orders@medlifedist.com', 'Plot 45, Industrial Area Phase II, Hyderabad')
    RETURNING id INTO supp_medlife;

    INSERT INTO public.suppliers (name, contact_person, phone, email, address)
    VALUES ('Apollo Surgicals & Generics', 'Pooja Verma', '+91 98450 11223', 'supply@apollosurgicals.in', '12-B MG Road, Bangalore')
    RETURNING id INTO supp_apollo;

    INSERT INTO public.suppliers (name, contact_person, phone, email, address)
    VALUES ('Bharat Pharma Logistics', 'Anil Kumar', '+91 97110 99887', 'contact@bharatlogistics.com', 'Sector 18, Electronic City, Gurgaon')
    RETURNING id INTO supp_bharat;

    -- 3. PURCHASES (Inward Stock Invoices)
    INSERT INTO public.purchases (purchase_number, supplier_id, total_quantity, total_amount, notes, created_at)
    VALUES ('PO-1001', supp_medlife, 100, 950.00, 'Monthly replenishment for Paracetamol and analgesics', CURRENT_DATE - INTERVAL '6 months')
    RETURNING id INTO po_id;

    INSERT INTO public.purchase_items (purchase_id, medicine_id, batch_number, quantity, purchase_price, subtotal, expiry_date)
    VALUES (po_id, med_pcm, 'PCM-B101', 60, 9.50, 570.00, CURRENT_DATE + INTERVAL '18 months');

    INSERT INTO public.purchase_items (purchase_id, medicine_id, batch_number, quantity, purchase_price, subtotal, expiry_date)
    VALUES (po_id, med_pcm, 'PCM-B102', 40, 9.50, 380.00, CURRENT_DATE + INTERVAL '22 months');

    -- 4. SALES (Counter Sales)
    INSERT INTO public.sales (sale_number, customer_name, total_items, total_quantity, total_amount, created_at)
    VALUES ('INV-1001', 'Ramesh Patel', 2, 3, 85.00, CURRENT_TIMESTAMP - INTERVAL '3 hours')
    RETURNING id INTO sale_id;

    INSERT INTO public.sale_items (sale_id, medicine_id, medicine_name, unit, quantity, unit_price, subtotal)
    VALUES (sale_id, med_pcm, 'Paracetamol 500mg Tablets', 'tablets', 2, 15.00, 30.00)
    RETURNING id INTO item_id;

    INSERT INTO public.sale_batch_allocations (sale_item_id, batch_number, quantity, expiry_date)
    VALUES (item_id, 'PCM-B101', 2, CURRENT_DATE + INTERVAL '18 months');

    INSERT INTO public.sale_items (sale_id, medicine_id, medicine_name, unit, quantity, unit_price, subtotal)
    VALUES (sale_id, med_panto, 'Pantoprazole 40mg Tablets', 'strips', 1, 55.00, 55.00)
    RETURNING id INTO item_id;

    INSERT INTO public.sale_batch_allocations (sale_item_id, batch_number, quantity, expiry_date)
    VALUES (item_id, 'PAN-410', 1, CURRENT_DATE + INTERVAL '14 months');

    -- 5. FORECAST SETTINGS & REORDER REVIEWS
    INSERT INTO public.forecast_settings (default_horizon_days, safety_buffer_days, min_data_days_required, method)
    VALUES (30, 5, 7, 'weighted_moving_average');

    INSERT INTO public.reorder_recommendation_reviews (medicine_id, review_status, suggested_quantity, reviewer_notes)
    VALUES (med_cetz, 'pending', 45, 'High allergy season demand expected, immediate stockout risk.');

END $$;

