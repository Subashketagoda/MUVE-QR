'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, BellRing, Volume2, ShieldAlert, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

// Helper: Convert Base64 URL to Uint8Array for VAPID subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function LockScreenNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null)
  const [incomingAlert, setIncomingAlert] = useState<any>(null)
  const seenAlertIdsRef = useRef<Set<string>>(new Set())

  // 1. Play Urgent Siren/Chime Alert via Web Audio API (Reliable without external file)
  const playAlertSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Tone 1: High pitch (900 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.setValueAtTime(1174, now + 0.15)
      osc1.frequency.setValueAtTime(880, now + 0.3)
      osc1.frequency.setValueAtTime(1174, now + 0.45)

      gain1.gain.setValueAtTime(0.25, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.7)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.7)
    } catch (e) {
      console.warn('Audio alert error:', e)
    }
  }, [])

  // 2. Hardware Vibration for phones
  const vibratePhone = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200, 600])
      }
    } catch (e) {}
  }, [])

  // 3. Trigger Lock Screen Native Notification
  const triggerLockScreenNotification = useCallback(
    (title: string, message: string, url = '/app/tasks', tag = 'muve-report-alert') => {
      // Play audio and vibrate immediately
      playAlertSound()
      vibratePhone()

      // Primary: Service Worker showNotification (Appears on Mobile Lock Screen & Desktop Notification Center)
      if (swReg && 'showNotification' in swReg) {
        swReg.showNotification(title, {
          body: message,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [400, 200, 400, 200, 600],
          tag: tag,
          renotify: true,
          requireInteraction: true, // Remains on Lock Screen until staff member interacts!
          data: { url },
        })
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        // Fallback: window Notification
        try {
          new Notification(title, {
            body: message,
            icon: '/icons/icon-192.png',
            tag: tag,
          })
        } catch (e) {}
      }
    },
    [swReg, playAlertSound, vibratePhone]
  )

  // 4. Register Push Subscription to backend
  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      // Fetch public VAPID key
      const res = await fetch('/api/push/subscribe')
      const data = await res.json()
      if (!data.success || !data.publicKey) return false

      const convertedKey = urlBase64ToUint8Array(data.publicKey)

      // Subscribe to PushManager
      const existingSub = await reg.pushManager.getSubscription()
      const subscription =
        existingSub ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        }))

      // Read current logged-in user if available
      let userId = 'staff'
      try {
        const saved = localStorage.getItem('muve_user')
        if (saved) userId = JSON.parse(saved).id || 'staff'
      } catch (e) {}

      // Save to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId,
          userAgent: navigator.userAgent,
        }),
      })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.warn('Push subscription failed:', err)
      return false
    }
  }, [])

  // 5. Initialize Service Worker & check permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load previously seen alert IDs from sessionStorage
    try {
      const stored = sessionStorage.getItem('muve_seen_alert_ids')
      if (stored) {
        JSON.parse(stored).forEach((id: string) => seenAlertIdsRef.current.add(id))
      }
    } catch (e) {}

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwReg(reg)
          if (Notification.permission === 'granted') {
            subscribeToPush(reg)
          }
        })
        .catch((err) => {
          console.warn('Service worker registration error:', err)
        })
    }
  }, [subscribeToPush])

  // 6. User 1-Tap Enable Action
  const enableLockScreenAlerts = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported by this browser.')
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        if (swReg) {
          await subscribeToPush(swReg)
        }
        playAlertSound()
        vibratePhone()
        triggerLockScreenNotification(
          '🔔 Lock Screen Alerts Active!',
          'You will now receive instant audible and lock-screen alerts for visitor reports.',
          '/app/tasks',
          'muve-welcome'
        )
        toast.success('Lock screen & sound alerts enabled successfully!')
      } else {
        toast.info('Notification permission was declined.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 7. Test Alert Action (Staff can test their lock screen right away)
  const testAlert = () => {
    toast.info('Test alert sent! Lock your phone screen to see it appear.', { duration: 4000 })
    setTimeout(() => {
      triggerLockScreenNotification(
        '🚨 TEST: [MAINTENANCE] 01st Floor - Ladies Washroom',
        'Visitor reported: Water leakage near sink (HIGH PRIORITY) — Lock Screen Test Alert',
        '/app/tasks',
        `test-${Date.now()}`
      )
    }, 1500)
  }

  // 8. Handle Incoming Alert Detection (Realtime + Polling fallback)
  const handleNewAlert = useCallback(
    (alert: { id?: string; title: string; message: string; created_at?: string }) => {
      const alertId = alert.id || `${alert.title}_${alert.created_at || Date.now()}`
      if (seenAlertIdsRef.current.has(alertId)) return

      seenAlertIdsRef.current.add(alertId)
      try {
        sessionStorage.setItem(
          'muve_seen_alert_ids',
          JSON.stringify(Array.from(seenAlertIdsRef.current))
        )
      } catch (e) {}

      // Trigger lock screen notification, vibration, and loud audio
      triggerLockScreenNotification(alert.title, alert.message, '/app/tasks', alertId)

      // Set in-app floating emergency banner
      setIncomingAlert(alert)
    },
    [triggerLockScreenNotification]
  )

  // 9. Subscribe to Supabase Realtime 'notifications' table
  useEffect(() => {
    let channel: any = null
    try {
      channel = supabase
        .channel('lockscreen-report-broadcast')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload: any) => {
            const notif = payload.new
            if (notif && (notif.type === 'alert' || notif.title?.includes('Report') || notif.title?.includes('🚨'))) {
              handleNewAlert(notif)
            }
          }
        )
        .subscribe()
    } catch (e) {}

    // Polling fallback every 3.5s to ensure zero missed reports
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications?t=${Date.now()}`, { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.notifications)) {
          // Check most recent 5 notifications
          const recentAlerts = json.notifications
            .slice(0, 5)
            .filter((n: any) => n.type === 'alert' || n.title?.includes('Report') || n.title?.includes('🚨'))

          for (const alert of recentAlerts) {
            const alertId = alert.id || alert.title
            if (!seenAlertIdsRef.current.has(alertId)) {
              handleNewAlert(alert)
            }
          }
        }
      } catch (e) {}
    }, 3500)

    // BroadcastChannel cross-tab listener
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('muve_alerts_bus')
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.alert) {
            handleNewAlert(ev.data.alert)
          }
        }
      }
    } catch (e) {}

    return () => {
      clearInterval(pollInterval)
      if (channel) supabase.removeChannel(channel)
      if (bc) bc.close()
    }
  }, [handleNewAlert])

  return (
    <>
      {/* ============================================================
          1. FLOATING EMERGENCY BANNER (When a new report arrives)
          ============================================================ */}
      {incomingAlert && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-bounce">
          <div className="p-4 rounded-2xl bg-red-600 text-white shadow-2xl border-2 border-white/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white text-red-600 font-black flex-shrink-0 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-100">
                  🚨 NEW INCIDENT REPORT
                </p>
                <h4 className="text-sm font-extrabold leading-tight mt-0.5">{incomingAlert.title}</h4>
                <p className="text-xs text-red-100 mt-1 line-clamp-2">{incomingAlert.message}</p>
                <a
                  href="/app/tasks"
                  className="inline-block mt-2 px-3 py-1 bg-white text-red-700 font-black text-xs rounded-lg shadow hover:bg-red-50 transition-colors"
                >
                  Open Task Checklist →
                </a>
              </div>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          2. PERMISSION SETUP BANNER (Prompt to enable lock screen alerts)
          Only displayed if permission is default and not dismissed
          ============================================================ */}
      {permission !== 'granted' && !bannerDismissed && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 p-2.5 px-4 shadow-lg flex items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 animate-bounce flex-shrink-0" />
            <span>Enable Lock Screen & Sound Alerts for new visitor reports</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={enableLockScreenAlerts}
              className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-black hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Enable Now
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-slate-900/70 hover:text-slate-950 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          3. ACTIVE STATUS CHIP & TEST TRIGGER (Subtle in footer or layout)
          ============================================================ */}
      <div className="hidden">
        {/* Hidden anchor exposing test function to window for debug or triggers */}
        <span id="muve-notification-status" data-permission={permission} data-subscribed={isSubscribed} />
      </div>
    </>
  )
}
