-- ============================================================
-- MUVE QR — Complete Supabase Schema (100% Online Cloud Ready)
-- Copy and paste this entire SQL script into your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default system settings
INSERT INTO public.settings (key, value) VALUES
  ('org_name', 'MUVE QR Corp'),
  ('timezone', 'UTC'),
  ('date_format', 'DD/MM/YYYY'),
  ('duplicate_scan_cooldown', '5'),
  ('gps_verification_enabled', 'false'),
  ('notification_sound_enabled', 'true'),
  ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. USERS TABLE (Extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. QR CODES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  location_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. SCAN LOGS TABLE (Immutable Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  qr_id UUID NOT NULL,
  qr_token TEXT NOT NULL,
  qr_name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'rejected', 'invalid', 'inactive', 'cooldown', 'geofence_fail')),
  rejection_reason TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  device_info TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'scan' CHECK (type IN ('scan', 'alert', 'system', 'invalid_scan')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scan_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON public.scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_id ON public.scan_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);

-- ============================================================
-- 8. AUTO USER CREATION TRIGGER
-- Auto-syncs Supabase auth.users -> public.users table
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies for full operational integration
DROP POLICY IF EXISTS "Public access users" ON public.users;
CREATE POLICY "Public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access qr_codes" ON public.qr_codes;
CREATE POLICY "Public access qr_codes" ON public.qr_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access scan_logs" ON public.scan_logs;
CREATE POLICY "Public access scan_logs" ON public.scan_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access notifications" ON public.notifications;
CREATE POLICY "Public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access audit_logs" ON public.audit_logs;
CREATE POLICY "Public access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access settings" ON public.settings;
CREATE POLICY "Public access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 10. REALTIME PUBLICATION SETUP (Idempotent safe check)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'scan_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

