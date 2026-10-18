export interface PushSubscriptionRecord {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userId?: string
  userAgent?: string
  createdAt: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qokfbbcwykbdruvqwnhr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_g3D5qPwtftS5rdjYSfeDmg_MoxMSr-0'

// Load all subscriptions from Supabase settings table (key: 'push_subscriptions')
export async function getAllPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.push_subscriptions`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.value) {
      const parsed = JSON.parse(data[0].value)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('[PushStore] Error reading subscriptions from Supabase:', e)
  }
  return []
}

// Save a new or updated subscription to Supabase settings table
export async function addPushSubscription(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord[]> {
  const current = await getAllPushSubscriptions()
  const existsIdx = current.findIndex((s) => s.endpoint === sub.endpoint)
  if (existsIdx >= 0) {
    current[existsIdx] = sub
  } else {
    current.push(sub)
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.push_subscriptions`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(current),
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('[PushStore] Error saving subscription to Supabase:', e)
  }

  return current
}

// Remove an expired or unsubscribed endpoint from Supabase settings table
export async function removePushSubscription(endpoint: string): Promise<PushSubscriptionRecord[]> {
  const current = await getAllPushSubscriptions()
  const filtered = current.filter((s) => s.endpoint !== endpoint)

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.push_subscriptions`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(filtered),
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('[PushStore] Error removing subscription from Supabase:', e)
  }

  return filtered
}
