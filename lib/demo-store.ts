// ============================================================
// MUVE QR — In-Memory Demo Store & State Handler
// Fallback state store when Supabase credentials are not connected
// ============================================================

import { QRCodeRow, ScanLogRow, UserRow, AuditLogRow, NotificationRow, AppSettings, TodoRow } from '@/types/database'

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

export let INITIAL_TODOS: TodoRow[] = [
  {
    id: 'todo_001',
    user_id: '00000000-0000-0000-0000-000000000002',
    user_name: 'User 01',
    user_phone: '077 111 1111',
    title: 'Inspect Sector 4 Emergency Exit QR Code',
    description: 'Ensure QR sticker is clean and readable, verify perimeter lighting.',
    priority: 'high',
    status: 'completed',
    admin_reviewed: true,
    admin_notes: 'Verified scan logs match timestamp. Checked & approved.',
    reviewed_by: 'System Admin',
    reviewed_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'todo_002',
    user_id: '00000000-0000-0000-0000-000000000002',
    user_name: 'User 01',
    user_phone: '077 111 1111',
    title: 'Report damaged QR bracket at Loading Dock B',
    description: 'Bracket is loose due to forklift vibration. Needs re-mounting before next shift.',
    priority: 'urgent',
    status: 'pending',
    admin_reviewed: false,
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'todo_003',
    user_id: 'usr_user_002',
    user_name: 'User 02',
    user_phone: '077 222 2222',
    title: 'Daily patrol checklist for Main Entrance & Reception',
    description: 'Verify all staff and visitor badges before shift handover.',
    priority: 'medium',
    status: 'completed',
    admin_reviewed: false,
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
]

