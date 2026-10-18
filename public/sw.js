// MUVE QR Enterprise Facility Service Worker
// Enables Native Lock-Screen Notifications, Push Alerts, and Device Vibration

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// 1. Handle Web Push from backend (even when phone is locked or browser is closed)
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 MUVE Facility Incident Alert',
    body: 'A new checkpoint issue report has been submitted.',
    url: '/app/tasks',
    tag: 'muve-report-alert',
  }

  if (event.data) {
    try {
      const json = event.data.json()
      payload = { ...payload, ...json }
    } catch (e) {
      payload.body = event.data.text()
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [400, 200, 400, 200, 600],
    tag: payload.tag || `muve-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Forces notification to stay on lock screen until acted on
    data: {
      url: payload.url || '/app/tasks',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'view', title: '🚨 View Task' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

// 2. Handle Lock Screen Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/app/tasks'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // If no window is open, open a new window to the tasks page
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// 3. Handle messages from client tabs (for direct lock-screen display)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_LOCKSCREEN_NOTIFICATION') {
    const { title, body, tag, data } = event.data
    const options = {
      body: body || 'New report alert',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [400, 200, 400, 200, 600],
      tag: tag || `muve-lock-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: data || { url: '/app/tasks' },
      actions: [
        { action: 'view', title: '🚨 View Task' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }

    event.waitUntil(self.registration.showNotification(title || '🚨 Facility Alert', options))
  }
})
