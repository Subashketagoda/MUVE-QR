import { IncidentRow, IncidentCategory, IncidentSeverity, IncidentStatus } from '@/types/database'
import { sendPushToAllStaff } from './web-push-sender'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qokfbbcwykbdruvqwnhr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_g3D5qPwtftS5rdjYSfeDmg_MoxMSr-0'

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// In-memory fallback array
let IN_MEMORY_INCIDENTS: IncidentRow[] = [
  {
    id: 'inc_sample_001',
    title: 'Broken Padlock on Rear Fire Exit',
    category: 'security',
    severity: 'high',
    location_name: 'Warehouse Rear Fire Exit',
    description: 'The master padlock chain was found severed during 02:00 AM patrol. Door is secured temporarily with manual latch.',
    photo_url: null,
    reported_by_id: '00000000-0000-0000-0000-000000000002',
    reported_by_name: 'User 01',
    reported_by_phone: '077 111 1111',
    status: 'investigating',
    action_taken: 'Notified facilities manager; replacement lock requested.',
    resolved_by: null,
    resolved_at: null,
    latitude: 6.9271,
    longitude: 79.8612,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'inc_sample_002',
    title: 'Water Pipe Leak Near Electrical Panel',
    category: 'maintenance',
    severity: 'critical',
    location_name: 'Basement Parking Pillar B4',
    description: 'Heavy dripping observed directly above electrical conduit. Water accumulation on floor posing slip and electrocution hazard.',
    photo_url: null,
    reported_by_id: '00000000-0000-0000-0000-000000000002',
    reported_by_name: 'User 01',
    reported_by_phone: '077 111 1111',
    status: 'reported',
    action_taken: null,
    resolved_by: null,
    resolved_at: null,
    latitude: 6.9275,
    longitude: 79.8615,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
]

/**
 * Reads all incidents from Supabase settings (key: 'incidents_store') or fallback memory.
 */
export async function getAllIncidents(): Promise<IncidentRow[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.incidents_store&select=*`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.value) {
      const parsed = JSON.parse(data[0].value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        IN_MEMORY_INCIDENTS = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('[IncidentsStore] Error reading from Supabase settings:', e)
  }

  return IN_MEMORY_INCIDENTS
}

/**
 * Persists full incidents list to Supabase settings table.
 */
async function persistIncidents(incidents: IncidentRow[]) {
  IN_MEMORY_INCIDENTS = incidents
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.incidents_store`, {
      method: 'GET',
      headers: HEADERS,
      cache: 'no-store',
    })
    const existing = await res.json()

    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.incidents_store`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          value: JSON.stringify(incidents),
          updated_at: new Date().toISOString(),
        }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          key: 'incidents_store',
          value: JSON.stringify(incidents),
          updated_at: new Date().toISOString(),
        }),
      })
    }
  } catch (e) {
    console.warn('[IncidentsStore] Error saving to Supabase settings:', e)
  }
}

/**
 * Creates and broadcasts a new incident report.
 */
export async function createIncident(data: {
  title: string
  category: IncidentCategory
  severity: IncidentSeverity
  location_name: string
  description: string
  photo_url?: string | null
  reported_by_id: string
  reported_by_name: string
  reported_by_phone?: string | null
  latitude?: number | null
  longitude?: number | null
}): Promise<IncidentRow> {
  const current = await getAllIncidents()
  const newIncident: IncidentRow = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: data.title.trim(),
    category: data.category,
    severity: data.severity,
    location_name: data.location_name.trim(),
    description: data.description.trim(),
    photo_url: data.photo_url || null,
    reported_by_id: data.reported_by_id,
    reported_by_name: data.reported_by_name,
    reported_by_phone: data.reported_by_phone || null,
    status: 'reported',
    action_taken: null,
    resolved_by: null,
    resolved_at: null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const updated = [newIncident, ...current]
  await persistIncidents(updated)

  // Also log into Supabase notifications table for instant system-wide admin notice
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        type: 'alert',
        title: `🚨 ${newIncident.severity.toUpperCase()} INCIDENT: ${newIncident.title}`,
        message: `Reported by ${newIncident.reported_by_name} at ${newIncident.location_name}: ${newIncident.description}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('[IncidentsStore] Failed to insert into notifications table:', e)
  }

  // Dispatch Web Push notification to admin/staff devices
  try {
    await sendPushToAllStaff({
      title: `🚨 ${newIncident.severity.toUpperCase()} INCIDENT: ${newIncident.title}`,
      body: `📍 ${newIncident.location_name} • Reported by ${newIncident.reported_by_name}`,
      url: `/admin/incidents`,
      priority: newIncident.severity === 'critical' ? 'high' : 'normal',
      tag: `incident-${newIncident.id}`,
    })
  } catch (e) {
    console.warn('[IncidentsStore] Web push dispatch error:', e)
  }

  return newIncident
}

/**
 * Updates status or action taken for an existing incident.
 */
export async function updateIncidentStatus(
  id: string,
  updates: {
    status?: IncidentStatus
    action_taken?: string | null
    resolved_by?: string | null
  }
): Promise<IncidentRow | null> {
  const current = await getAllIncidents()
  const index = current.findIndex((i) => i.id === id)
  if (index === -1) return null

  const now = new Date().toISOString()
  const existing = current[index]
  const updatedIncident: IncidentRow = {
    ...existing,
    ...updates,
    resolved_at: updates.status === 'resolved' ? (existing.resolved_at || now) : existing.resolved_at,
    updated_at: now,
  }

  current[index] = updatedIncident
  await persistIncidents(current)
  return updatedIncident
}
