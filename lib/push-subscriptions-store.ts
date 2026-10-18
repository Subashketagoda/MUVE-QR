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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qokfbbcwykbdruvqwnhr.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_g3D5qPwtftS5rdjYSfeDmg_MoxMSr-0'

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ─── Load all push subscriptions from Supabase settings row ─────────────────
export async function getAllPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.push_subscriptions`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.value) {
      const parsed = JSON.parse(data[0].value)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('[PushStore] Error reading subscriptions:', e)
  }
  return []
}

// ─── Persist the subscriptions array back to Supabase (upsert) ──────────────
async function persistSubscriptions(list: PushSubscriptionRecord[]): Promise<void> {
  const value = JSON.stringify(list)
  const updated_at = new Date().toISOString()

  // Try PATCH first (update existing row)
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?key=eq.push_subscriptions`,
    {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ value, updated_at }),
    }
  )

  // If nothing was updated (row doesn't exist yet), INSERT it
  const patchData = await patchRes.json().catch(() => [])
  if (Array.isArray(patchData) && patchData.length === 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ key: 'push_subscriptions', value, updated_at }),
    })
  }
}

// ─── Add or update a subscription ───────────────────────────────────────────
export async function addPushSubscription(
  sub: PushSubscriptionRecord
): Promise<PushSubscriptionRecord[]> {
  const current = await getAllPushSubscriptions()
  const existsIdx = current.findIndex((s) => s.endpoint === sub.endpoint)
  if (existsIdx >= 0) {
    current[existsIdx] = sub // Update existing entry (refreshed keys / userId)
  } else {
    current.push(sub)
  }
  try {
    await persistSubscriptions(current)
  } catch (e) {
    console.warn('[PushStore] Error saving subscription:', e)
  }
  return current
}

// ─── Remove an expired / unsubscribed endpoint ──────────────────────────────
export async function removePushSubscription(
  endpoint: string
): Promise<PushSubscriptionRecord[]> {
  const current = await getAllPushSubscriptions()
  const filtered = current.filter((s) => s.endpoint !== endpoint)
  try {
    await persistSubscriptions(filtered)
  } catch (e) {
    console.warn('[PushStore] Error removing subscription:', e)
  }
  return filtered
}
