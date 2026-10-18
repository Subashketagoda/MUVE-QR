// MUVE QR Enterprise Facility Service Worker
// v3 — Reliable lock-screen notifications, audio alerts, and cross-tab broadcasting

const CACHE_VERSION = 'muve-sw-v3'

self.addEventListener('install', () => {
  // Immediately take over — don't wait for old SW to idle
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim all open clients immediately so push events are handled right away
  event.waitUntil(self.clients.claim())
})

// ─── 1. PUSH EVENT ─────────────────────────────────────────────────────────
// Fires when the backend sends a Web Push — even when phone is locked or browser closed
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 MUVE Facility Alert',
    body: 'New activity requires your attention.',
    url: '/app/tasks',
    tag: `muve-alert-${Date.now()}`,
  }

  if (event.data) {
    try {
      const json = event.data.json()
      payload = { ...payload, ...json }
    } catch {
      try { payload.body = event.data.text() } catch {}
    }
  }

  const notifOptions = {
    body: payload.body,
    icon: '/muve-logo.jpg',
    badge: '/muve-logo.jpg',
    vibrate: [300, 150, 300, 150, 600],
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: payload.url || '/app/tasks',
      payload,
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: '👁 View Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  // Show the native lock-screen notification FIRST, then broadcast to open tabs
  event.waitUntil(
    self.registration.showNotification(payload.title, notifOptions).then(() => {
      // After notification is shown, broadcast to all open client windows
      // so the in-app modal popup appears too
      return self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_RECEIVED',
              payload,
            })
          })
        })
    })
  )
})

// ─── 2. NOTIFICATION CLICK ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/app/tasks'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window and navigate it
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        // No window open — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

// ─── 3. MESSAGE FROM CLIENT TAB ────────────────────────────────────────────
// Clients can ask the SW to show a notification directly (when app is open)
self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SHOW_LOCKSCREEN_NOTIFICATION') {
    const { title, body, tag, url, data } = event.data

    const options = {
      body: body || 'New alert',
      icon: '/muve-logo.jpg',
      badge: '/muve-logo.jpg',
      vibrate: [300, 150, 300, 150, 600],
      tag: tag || `muve-lock-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: data || { url: url || '/app/tasks' },
      actions: [
        { action: 'open', title: '👁 View Now' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }

    // NOTE: message handler does NOT support event.waitUntil in all browsers.
    // We use a workaround: grab the SW registration directly.
    self.registration.showNotification(title || '🚨 MUVE Alert', options).catch(() => {})
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
