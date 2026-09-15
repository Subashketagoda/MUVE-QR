// ============================================================
// MUVE QR — In-Memory Demo Store & State Handler
// Fallback state store when Supabase credentials are not connected
// ============================================================

import { QRCodeRow, ScanLogRow, UserRow, AuditLogRow, NotificationRow, AppSettings } from '@/types/database'

export let INITIAL_USERS: UserRow[] = [
  {
    id: 'usr_admin_001',
    full_name: 'System Admin',
    email: 'admin@muveqr.app',
    phone: '0770000001',
    role: 'admin',
    status: 'active',
    avatar_url: null,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_user_001',
    full_name: 'User 01',
    email: 'user01@muveqr.app',
    phone: '0771111111',
    role: 'user',
    status: 'active',
    avatar_url: null,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_user_002',
    full_name: 'User 02',
    email: 'user02@muveqr.app',
    phone: '0772222222',
    role: 'user',
    status: 'active',
    avatar_url: null,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_user_003',
    full_name: 'User 03',
    email: 'user03@muveqr.app',
    phone: '0773333333',
    role: 'user',
    status: 'active',
    avatar_url: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export let INITIAL_QR_CODES: QRCodeRow[] = []

export let INITIAL_SCANS: ScanLogRow[] = []


export let INITIAL_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'notif_001',
    type: 'scan',
    title: 'New Scan Recorded',
    message: 'User 02 scanned QR1 (Main Entrance)',
    scan_id: 'scan_002',
    is_read: false,
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'notif_002',
    type: 'scan',
    title: 'New Scan Recorded',
    message: 'User 01 scanned QR1 (Main Entrance)',
    scan_id: 'scan_001',
    is_read: true,
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
]

export let INITIAL_AUDIT_LOGS: AuditLogRow[] = [
  {
    id: 'audit_001',
    admin_id: 'usr_admin_001',
    admin_name: 'System Admin',
    action: 'qr_created',
    target_type: 'qr_code',
    target_id: 'qr_001',
    target_name: 'QR1',
    details: { location: 'Main Entrance' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'audit_002',
    admin_id: 'usr_admin_001',
    admin_name: 'System Admin',
    action: 'user_created',
    target_type: 'user',
    target_id: 'usr_user_001',
    target_name: 'User 01',
    details: { email: 'user01@muveqr.app', role: 'user' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
]

export let INITIAL_SETTINGS: AppSettings = {
  org_name: 'MUVE QR Corp',
  timezone: 'UTC',
  date_format: 'DD/MM/YYYY',
  duplicate_scan_cooldown: '5',
  gps_verification_enabled: 'false',
  notification_sound_enabled: 'true',
  logo_url: '',
}
