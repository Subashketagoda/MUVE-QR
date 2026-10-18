import webpush from 'web-push'
import { getAllPushSubscriptions, removePushSubscription } from './push-subscriptions-store'

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BIA_CUhbV4j1w-cJje3dUcQJESO4xZw7AAP3c_6C3JdWpxx_dL0eBIozC_AcBYO57acyNUHDfOAy9g8aY-6OYrg'

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'RhnesB5ERyZdxqjDCCHYGceOdPbtKhbCjH9k4-DQzwg'

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@muveqr.app'

// Configure web-push with VAPID details
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} catch (e) {
  console.warn('Failed to set VAPID details for web-push:', e)
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
  category?: string
  priority?: string
}

/**
 * Dispatches an instant Web Push notification directly to all subscribed staff devices.
 * This triggers the device lock-screen display, sound, and vibration via the Service Worker.
 */
export async function sendPushToAllStaff(payload: PushNotificationPayload) {
  const subscriptions = await getAllPushSubscriptions()
  if (!subscriptions || subscriptions.length === 0) {
    console.log('[WebPush] No staff push subscriptions registered yet.')
    return { success: true, count: 0, sent: 0 }
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/app/tasks',
    tag: payload.tag || `muve-alert-${Date.now()}`,
    category: payload.category || 'maintenance',
    priority: payload.priority || 'high',
    timestamp: Date.now(),
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payloadString,
          {
            urgency: 'high',
            TTL: 60 * 60 * 24, // 24 hours
          }
        )
        return { endpoint: sub.endpoint, success: true }
      } catch (err: any) {
        // If subscription is expired or unsubscribed (HTTP 410 or 404), clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removePushSubscription(sub.endpoint)
        }
        throw err
      }
    })
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`[WebPush] Dispatched to staff: ${successful} success, ${failed} failed`)
  return { success: true, count: subscriptions.length, sent: successful }
}
