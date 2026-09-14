// ============================================================
// MUVE QR — Complete TypeScript Database Types
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type QRStatus = 'active' | 'inactive' | 'archived'
export type ScanStatus = 'success' | 'rejected' | 'invalid' | 'inactive' | 'cooldown' | 'geofence_fail'
export type NotificationType = 'scan' | 'alert' | 'system' | 'invalid_scan'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: UserRole
          status: UserStatus
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role?: UserRole
          status?: UserStatus
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          role?: UserRole
          status?: UserStatus
          avatar_url?: string | null
          updated_at?: string
        }
      }
      qr_codes: {
        Row: {
          id: string
          name: string
          token: string
          location_name: string
          description: string | null
          status: QRStatus
          latitude: number | null
          longitude: number | null
          geofence_radius: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          token: string
          location_name: string
          description?: string | null
          status?: QRStatus
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          location_name?: string
          description?: string | null
          status?: QRStatus
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number | null
          updated_at?: string
        }
      }
      scan_logs: {
        Row: {
          id: string
          user_id: string
          qr_id: string
          qr_token: string
          qr_name: string
          location_name: string
          status: ScanStatus
          rejection_reason: string | null
          latitude: number | null
          longitude: number | null
          device_info: string | null
          scanned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          qr_id: string
          qr_token: string
          qr_name: string
          location_name: string
          status?: ScanStatus
          rejection_reason?: string | null
          latitude?: number | null
          longitude?: number | null
          device_info?: string | null
          scanned_at?: string
          created_at?: string
        }
        Update: never
      }
      notifications: {
        Row: {
          id: string
          type: NotificationType
          title: string
          message: string
          scan_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type?: NotificationType
          title: string
          message: string
          scan_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          admin_id: string | null
          admin_name: string
          action: string
          target_type: string | null
          target_id: string | null
          target_name: string | null
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          admin_name: string
          action: string
          target_type?: string | null
          target_id?: string | null
          target_name?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: never
      }
      settings: {
        Row: {
          id: string
          key: string
          value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          value?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      scan_stats: {
        Row: {
          scans_today: number | null
          scans_this_week: number | null
          scans_this_month: number | null
          total_scans: number | null
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
    }
  }
}

// ============================================================
// Convenience derived types
// ============================================================
export type UserRow = Database['public']['Tables']['users']['Row']
export type QRCodeRow = Database['public']['Tables']['qr_codes']['Row']
export type ScanLogRow = Database['public']['Tables']['scan_logs']['Row']
export type NotificationRow = Database['public']['Tables']['notifications']['Row']
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']
export type SettingRow = Database['public']['Tables']['settings']['Row']

// Enriched scan log (with joined user and QR data)
export type ScanLogEnriched = ScanLogRow & {
  user?: Pick<UserRow, 'full_name' | 'email'>
  qr?: Pick<QRCodeRow, 'name' | 'location_name'>
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalQRCodes: number
  scansToday: number
  scansThisWeek: number
  scansThisMonth: number
}

// Scan API request/response
export interface ScanRequest {
  qrToken: string
  latitude?: number
  longitude?: number
  deviceInfo?: string
}

export interface ScanResponse {
  success: boolean
  message: string
  scan?: {
    id: string
    user: string
    qr: string
    location: string
    timestamp: string
    status: ScanStatus
  }
}

// Settings map
export interface AppSettings {
  org_name: string
  timezone: string
  date_format: string
  duplicate_scan_cooldown: string
  gps_verification_enabled: string
  notification_sound_enabled: string
  logo_url: string
}
