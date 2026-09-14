-- ============================================================
-- MUVE QR — Demo Seed Data
-- Run AFTER schema.sql AND after creating auth users via Supabase Auth
-- 
-- STEP 1: Go to Supabase Dashboard → Authentication → Users
-- STEP 2: Create these users manually (or use the app's signup):
--   admin@muveqr.app  / Admin@123456
--   user01@muveqr.app / User@123456
--   user02@muveqr.app / User@123456
--   user03@muveqr.app / User@123456
-- STEP 3: Copy each user's UUID from the Auth users list
-- STEP 4: Replace the placeholder UUIDs below with real UUIDs
-- STEP 5: Run this SQL
--
-- NOTE: The handle_new_user() trigger auto-creates rows in public.users
-- This seed just updates the auto-created rows with proper data
-- ============================================================

-- ============================================================
-- UPDATE USERS (trigger creates rows, we update metadata)
-- Replace UUIDs with actual auth.users UUIDs from your project
-- ============================================================

-- Admin user
UPDATE public.users
SET full_name = 'System Admin', role = 'admin', status = 'active', phone = '+1-555-0100'
WHERE email = 'admin@muveqr.app';

-- Regular users
UPDATE public.users
SET full_name = 'User 01', role = 'user', status = 'active', phone = '+1-555-0101'
WHERE email = 'user01@muveqr.app';

UPDATE public.users
SET full_name = 'User 02', role = 'user', status = 'active', phone = '+1-555-0102'
WHERE email = 'user02@muveqr.app';

UPDATE public.users
SET full_name = 'User 03', role = 'user', status = 'active', phone = '+1-555-0103'
WHERE email = 'user03@muveqr.app';

-- ============================================================
-- QR CODES (tokens are secure nanoid-style strings)
-- ============================================================
INSERT INTO public.qr_codes (id, name, token, location_name, description, status)
VALUES
  (
    'a1b2c3d4-0001-0001-0001-a1b2c3d40001',
    'QR1',
    'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w',
    'Main Entrance',
    'Primary building entrance scanner',
    'active'
  ),
  (
    'a1b2c3d4-0002-0002-0002-a1b2c3d40002',
    'QR2',
    'MUVEQR-Office-yJ4nM6pS1uW5eA8d',
    'Office',
    'Main office area access point',
    'active'
  ),
  (
    'a1b2c3d4-0003-0003-0003-a1b2c3d40003',
    'QR3',
    'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',
    'Warehouse',
    'Warehouse loading dock entrance',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEMO SCAN LOGS
-- Uses a DO block to reference actual user UUIDs dynamically
-- ============================================================
DO $$
DECLARE
  v_user01 UUID;
  v_user02 UUID;
  v_user03 UUID;
  v_admin  UUID;
  v_qr1    UUID := 'a1b2c3d4-0001-0001-0001-a1b2c3d40001';
  v_qr2    UUID := 'a1b2c3d4-0002-0002-0002-a1b2c3d40002';
  v_qr3    UUID := 'a1b2c3d4-0003-0003-0003-a1b2c3d40003';
BEGIN
  SELECT id INTO v_user01 FROM public.users WHERE email = 'user01@muveqr.app';
  SELECT id INTO v_user02 FROM public.users WHERE email = 'user02@muveqr.app';
  SELECT id INTO v_user03 FROM public.users WHERE email = 'user03@muveqr.app';
  SELECT id INTO v_admin  FROM public.users WHERE email = 'admin@muveqr.app';

  IF v_user01 IS NULL OR v_user02 IS NULL OR v_user03 IS NULL THEN
    RAISE NOTICE 'One or more demo users not found. Please create auth users first.';
    RETURN;
  END IF;

  INSERT INTO public.scan_logs (user_id, qr_id, qr_token, qr_name, location_name, status, scanned_at) VALUES
    -- Today
    (v_user01, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '2 hours'),
    (v_user02, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '1 hour 45 min'),
    (v_user01, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '1 hour 30 min'),
    (v_user03, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '1 hour'),
    (v_user02, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '45 min'),
    (v_user01, v_qr3, 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',     'QR3', 'Warehouse',     'success', NOW() - INTERVAL '30 min'),
    (v_user03, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '15 min'),
    (v_user02, v_qr3, 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',     'QR3', 'Warehouse',     'success', NOW() - INTERVAL '5 min'),
    -- Yesterday
    (v_user01, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '1 day 8 hours'),
    (v_user02, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '1 day 7 hours 50 min'),
    (v_user01, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '1 day 7 hours 30 min'),
    (v_user03, v_qr3, 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',     'QR3', 'Warehouse',     'success', NOW() - INTERVAL '1 day 6 hours'),
    (v_user02, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '1 day 5 hours'),
    -- 2 days ago
    (v_user01, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '2 days 9 hours'),
    (v_user03, v_qr2, 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',        'QR2', 'Office',        'success', NOW() - INTERVAL '2 days 8 hours'),
    (v_user02, v_qr3, 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',     'QR3', 'Warehouse',     'success', NOW() - INTERVAL '2 days 7 hours'),
    -- Rejected scan demo
    (v_user01, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'cooldown', NOW() - INTERVAL '1 hour 59 min'),
    -- 3 days ago
    (v_user01, v_qr3, 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',     'QR3', 'Warehouse',     'success', NOW() - INTERVAL '3 days 10 hours'),
    (v_user02, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '3 days 9 hours'),
    (v_user03, v_qr1, 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w', 'QR1', 'Main Entrance', 'success', NOW() - INTERVAL '3 days 8 hours');

  -- Audit logs
  INSERT INTO public.audit_logs (admin_name, action, target_type, target_name, details)
  VALUES
    ('System Admin', 'qr_created', 'qr_code', 'QR1', '{"location": "Main Entrance"}'::jsonb),
    ('System Admin', 'qr_created', 'qr_code', 'QR2', '{"location": "Office"}'::jsonb),
    ('System Admin', 'qr_created', 'qr_code', 'QR3', '{"location": "Warehouse"}'::jsonb),
    ('System Admin', 'user_created', 'user', 'User 01', '{"email": "user01@muveqr.app"}'::jsonb),
    ('System Admin', 'user_created', 'user', 'User 02', '{"email": "user02@muveqr.app"}'::jsonb),
    ('System Admin', 'user_created', 'user', 'User 03', '{"email": "user03@muveqr.app"}'::jsonb);

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
