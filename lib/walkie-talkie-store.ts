// ============================================================
// MUVE QR — Walkie-Talkie (PTT Tactical Radio) Store & Real-Time Sync
// ============================================================

export interface WalkieChannel {
  id: string
  name: string
  code: string
  frequency: string
  description: string
  isEmergency?: boolean
}

export interface WalkieTransmission {
  id: string
  channel_id: string
  channel_name: string
  sender_id: string
  sender_name: string
  sender_role: 'user' | 'admin' | 'dispatcher'
  sender_callsign: string
  audio_base64?: string | null
  duration_ms: number
  type: 'voice' | '10-code'
  code_text?: string | null
  created_at: string
}

export interface OnlineOperator {
  id: string
  name: string
  role: 'user' | 'admin' | 'dispatcher'
  callsign: string
  channel_id: string
  last_ping: string
  is_transmitting?: boolean
}

export const WALKIE_CHANNELS: WalkieChannel[] = [
  {
    id: 'ch_1',
    name: 'Main Security & Dispatch',
    code: 'CH 01',
    frequency: '462.5625 MHz',
    description: 'Primary operational channel for all guards and central dispatch',
  },
  {
    id: 'ch_2',
    name: 'Checkpoint & Floor Patrols',
    code: 'CH 02',
    frequency: '467.5625 MHz',
    description: 'Tour inspectors and roaming security guards',
  },
  {
    id: 'ch_3',
    name: 'Facilities & Maintenance',
    code: 'CH 03',
    frequency: '462.6125 MHz',
    description: 'Damage reporting, plumbing, electrical, and hazard fixes',
  },
  {
    id: 'ch_4',
    name: 'Tactical Emergency All-Call',
    code: 'CH 04',
    frequency: '467.6125 MHz',
    description: 'Immediate priority broadcast — SOS panic & critical alarms',
    isEmergency: true,
  },
]

export const STANDARD_10_CODES = [
  { code: '10-4', title: 'Acknowledged', phrase: '10-4, copy that.' },
  { code: '10-20', title: 'Location Check', phrase: '10-20, what is your current location?' },
  { code: '10-8', title: 'In Service / On Duty', phrase: '10-8, in service and on active patrol.' },
  { code: '10-6', title: 'Busy / Stand By', phrase: '10-6, busy at location, standing by.' },
  { code: '10-9', title: 'Repeat Message', phrase: '10-9, say again your last transmission.' },
  { code: '10-33', title: 'Emergency Traffic', phrase: '10-33, emergency traffic! Clear the net!' },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qokfbbcwykbdruvqwnhr.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_g3D5qPwtftS5rdjYSfeDmg_MoxMSr-0'

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// In-Memory Fallback Transmissions Array
let IN_MEMORY_TRANSMISSIONS: WalkieTransmission[] = [
  {
    id: 'tx_init_001',
    channel_id: 'ch_1',
    channel_name: 'Main Security & Dispatch',
    sender_id: 'usr_dispatch_01',
    sender_name: 'Control Room Dispatcher',
    sender_role: 'dispatcher',
    sender_callsign: 'DISPATCH-HQ',
    duration_ms: 2400,
    type: '10-code',
    code_text: 'All patrol units, morning perimeter check initiated. Report status 10-8.',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'tx_init_002',
    channel_id: 'ch_1',
    channel_name: 'Main Security & Dispatch',
    sender_id: '00000000-0000-0000-0000-000000000002',
    sender_name: 'User 01',
    sender_role: 'user',
    sender_callsign: 'PATROL-01',
    duration_ms: 1800,
    type: '10-code',
    code_text: '10-4 Dispatch. Patrol-01 starting 1st floor inspection route.',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'tx_init_003',
    channel_id: 'ch_2',
    channel_name: 'Checkpoint & Floor Patrols',
    sender_id: 'usr_guard_02',
    sender_name: 'Kasun Silva',
    sender_role: 'user',
    sender_callsign: 'PATROL-02',
    duration_ms: 2100,
    type: '10-code',
    code_text: 'Checkpoint B2 Basement verified and secured.',
    created_at: new Date(Date.now() - 6 * 60000).toISOString(),
  },
]

// In-Memory Operators Tracker
let ONLINE_OPERATORS: Map<string, OnlineOperator> = new Map([
  [
    'usr_dispatch_01',
    {
      id: 'usr_dispatch_01',
      name: 'Control Room Dispatch',
      role: 'dispatcher',
      callsign: 'DISPATCH-HQ',
      channel_id: 'ch_1',
      last_ping: new Date().toISOString(),
    },
  ],
  [
    '00000000-0000-0000-0000-000000000002',
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'User 01',
      role: 'user',
      callsign: 'PATROL-01',
      channel_id: 'ch_1',
      last_ping: new Date().toISOString(),
    },
  ],
])

/**
 * Retrieve recent transmissions from Supabase or memory
 */
export async function getTransmissions(channelId?: string): Promise<WalkieTransmission[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.walkie_talkie_store&select=*`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.value) {
      const parsed = JSON.parse(data[0].value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        IN_MEMORY_TRANSMISSIONS = parsed
      }
    }
  } catch (e) {
    console.warn('[WalkieTalkieStore] Failed to fetch from Supabase:', e)
  }

  const list = channelId
    ? IN_MEMORY_TRANSMISSIONS.filter((t) => t.channel_id === channelId)
    : IN_MEMORY_TRANSMISSIONS

  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * Save new transmission
 */
export async function addTransmission(
  tx: Omit<WalkieTransmission, 'id' | 'created_at'>
): Promise<WalkieTransmission> {
  const newTx: WalkieTransmission = {
    ...tx,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  }

  // Prepend to top
  IN_MEMORY_TRANSMISSIONS.unshift(newTx)
  // Keep last 100 transmissions in storage
  IN_MEMORY_TRANSMISSIONS = IN_MEMORY_TRANSMISSIONS.slice(0, 100)

  // Asynchronously persist to Supabase settings
  persistToSupabase(IN_MEMORY_TRANSMISSIONS).catch((err) =>
    console.warn('[WalkieTalkieStore] Persist error:', err)
  )

  return newTx
}

async function persistToSupabase(transmissions: WalkieTransmission[]) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.walkie_talkie_store`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const existing = await res.json()

    // Store only up to 40 items in Supabase to keep row payload light
    const payload = JSON.stringify(transmissions.slice(0, 40))

    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.walkie_talkie_store`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          value: payload,
          updated_at: new Date().toISOString(),
        }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          key: 'walkie_talkie_store',
          value: payload,
          updated_at: new Date().toISOString(),
        }),
      })
    }
  } catch (e) {
    console.warn('[WalkieTalkieStore] Error in persistToSupabase:', e)
  }
}

/**
 * Operator Presence Management
 */
export function pingOperator(operator: {
  id: string
  name: string
  role: 'user' | 'admin' | 'dispatcher'
  callsign: string
  channel_id: string
  is_transmitting?: boolean
}): OnlineOperator[] {
  ONLINE_OPERATORS.set(operator.id, {
    ...operator,
    last_ping: new Date().toISOString(),
  })

  // Cleanup operators not seen in 45 seconds
  const cutoff = Date.now() - 45000
  for (const [id, op] of ONLINE_OPERATORS.entries()) {
    if (new Date(op.last_ping).getTime() < cutoff && id !== operator.id) {
      ONLINE_OPERATORS.delete(id)
    }
  }

  return Array.from(ONLINE_OPERATORS.values())
}

export function getOnlineOperators(channelId?: string): OnlineOperator[] {
  const all = Array.from(ONLINE_OPERATORS.values())
  if (!channelId) return all
  return all.filter((op) => op.channel_id === channelId)
}
