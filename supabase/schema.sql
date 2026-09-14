-- ============================================================
-- MUVE QR — Complete Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO public.settings (key, value) VALUES
  ('org_name', 'MUVE QR'),
  ('timezone', 'UTC'),
  ('date_format', 'DD/MM/YYYY'),
  ('duplicate_scan_cooldown', '5'),  -- minutes, 0 = disabled
  ('gps_verification_enabled', 'false'),
  ('notification_sound_enabled', 'true'),
  ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QR CODES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  location_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  -- Optional geofencing
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geofence_radius INTEGER,  -- meters, NULL = no geofence
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCAN LOGS TABLE (immutable audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  qr_id UUID NOT NULL REFERENCES public.qr_codes(id),
  qr_token TEXT NOT NULL,
  qr_name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'rejected', 'invalid', 'inactive', 'cooldown', 'geofence_fail')),
  rejection_reason TEXT,
  -- Location data (optional)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  -- Device info (optional)
  device_info TEXT,
  -- Timestamps
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'scan' CHECK (type IN ('scan', 'alert', 'system', 'invalid_scan')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scan_id UUID REFERENCES public.scan_logs(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id),
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'qr_created', 'user_suspended', etc.
  target_type TEXT,      -- 'qr_code', 'user', 'setting'
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON public.scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_id ON public.scan_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_status ON public.scan_logs(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- NEW USER HANDLER (auto-create profile on auth signup)
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── USERS policies ──
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile, admins can update all" ON public.users;
CREATE POLICY "Users can update own profile, admins can update all"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (public.is_admin());

-- ── QR CODES policies ──
DROP POLICY IF EXISTS "Authenticated users can read active QR codes" ON public.qr_codes;
CREATE POLICY "Authenticated users can read active QR codes"
  ON public.qr_codes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage QR codes" ON public.qr_codes;
CREATE POLICY "Admins can manage QR codes"
  ON public.qr_codes FOR ALL
  USING (public.is_admin());

-- ── SCAN LOGS policies ──
DROP POLICY IF EXISTS "Users can read own scans, admins read all" ON public.scan_logs;
CREATE POLICY "Users can read own scans, admins read all"
  ON public.scan_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert scans" ON public.scan_logs;
CREATE POLICY "Authenticated users can insert scans"
  ON public.scan_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE on scan_logs (immutable audit trail)

-- ── NOTIFICATIONS policies ──
DROP POLICY IF EXISTS "Admins can read all notifications" ON public.notifications;
CREATE POLICY "Admins can read all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Anyone authenticated can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (public.is_admin());

-- ── AUDIT LOGS policies ──
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- ── SETTINGS policies ──
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
CREATE POLICY "Authenticated users can read settings"
  ON public.settings FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
CREATE POLICY "Admins can update settings"
  ON public.settings FOR ALL
  USING (public.is_admin());

-- ============================================================
-- REALTIME — enable for live scan dashboard
-- ============================================================
-- Run these in Supabase Dashboard → Database → Replication
-- Or via the SQL editor:
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- ANALYTICS VIEWS (convenience)
-- ============================================================

CREATE OR REPLACE VIEW public.scan_stats AS
SELECT
  COUNT(*) FILTER (WHERE scanned_at >= CURRENT_DATE) AS scans_today,
  COUNT(*) FILTER (WHERE scanned_at >= date_trunc('week', NOW())) AS scans_this_week,
  COUNT(*) FILTER (WHERE scanned_at >= date_trunc('month', NOW())) AS scans_this_month,
  COUNT(*) AS total_scans
FROM public.scan_logs
WHERE status = 'success';

-- Grant access to views
GRANT SELECT ON public.scan_stats TO authenticated;
GRANT SELECT ON public.scan_stats TO service_role;
