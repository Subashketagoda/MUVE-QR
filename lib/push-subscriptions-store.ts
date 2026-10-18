import fs from 'fs'
import path from 'path'

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

// Global in-memory cache
declare global {
  var __muve_push_subscriptions: PushSubscriptionRecord[] | undefined
}

if (!global.__muve_push_subscriptions) {
  global.__muve_push_subscriptions = []
}

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'lib', 'push-subscriptions.json')

// Helper to load persisted subscriptions on startup
function loadSubscriptions(): PushSubscriptionRecord[] {
  if (global.__muve_push_subscriptions && global.__muve_push_subscriptions.length > 0) {
    return global.__muve_push_subscriptions
  }
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const content = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        global.__muve_push_subscriptions = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to read push subscriptions file:', e)
  }
  return global.__muve_push_subscriptions || []
}

function saveSubscriptions(subs: PushSubscriptionRecord[]) {
  global.__muve_push_subscriptions = subs
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), 'utf-8')
  } catch (e) {
    // Read-only filesystem on some serverless platforms, in-memory remains active
  }
}

export function addPushSubscription(sub: PushSubscriptionRecord) {
  const current = loadSubscriptions()
  const existsIdx = current.findIndex((s) => s.endpoint === sub.endpoint)
  if (existsIdx >= 0) {
    current[existsIdx] = sub
  } else {
    current.push(sub)
  }
  saveSubscriptions(current)
  return current
}

export function removePushSubscription(endpoint: string) {
  const current = loadSubscriptions()
  const filtered = current.filter((s) => s.endpoint !== endpoint)
  saveSubscriptions(filtered)
  return filtered
}

export function getAllPushSubscriptions(): PushSubscriptionRecord[] {
  return loadSubscriptions()
}
