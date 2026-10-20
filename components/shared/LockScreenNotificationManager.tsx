'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, BellRing, Volume2, ShieldAlert, CheckCircle2, X, MapPin, User, ArrowRight, AlertTriangle, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { soundEngine } from '@/lib/sounds'

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

      // Primary path A: Ask service worker to showNotification directly (works on locked screen)
      // Use navigator.serviceWorker.controller.postMessage — avoids the waitUntil issue
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_LOCKSCREEN_NOTIFICATION',
          title,
          body: message,
          tag,
          url,
          data: { url },
        })
      }

      // Primary path B: SW registration showNotification directly
      if (swReg && 'showNotification' in swReg) {
        swReg
          .showNotification(title, {
            body: message,
            icon: '/muve-logo.jpg',
            badge: '/muve-logo.jpg',
            vibrate: [300, 150, 300, 150, 600],
            tag,
            renotify: true,
            requireInteraction: true,
            silent: false,
            data: { url },
          } as any)
          .catch(() => {})
      }

      // Fallback: browser Notification API (no lock screen, but always visible)
      if (
        !swReg &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, {
            body: message,
            icon: '/muve-logo.jpg',
            tag,
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
  const isInitialLoadRef = useRef(true)

  const saveSeenIds = useCallback(() => {
    try {
      localStorage.setItem(
        'muve_seen_alert_ids',
        JSON.stringify(Array.from(seenAlertIdsRef.current).slice(-200))
      )
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load previously seen alert IDs from localStorage (persists across re-logins)
    try {
      const stored = localStorage.getItem('muve_seen_alert_ids')
      if (stored) {
        JSON.parse(stored).forEach((id: string) => seenAlertIdsRef.current.add(id))
      }
    } catch (e) {}

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Register Service Worker and await ready state
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // Force the new SW to activate immediately if waiting
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing
            if (newSW) {
              newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                  newSW.postMessage({ type: 'SKIP_WAITING' })
                }
              })
            }
          })
          return navigator.serviceWorker.ready
        })
        .then((reg) => {
          setSwReg(reg)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            subscribeToPush(reg)
          }
        })
        .catch((err) => {
          console.warn('Service worker registration error:', err)
        })
    }

    // Listen for PUSH_NOTIFICATION_RECEIVED from the service worker
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED' && event.data.payload) {
        const p = event.data.payload
        const alert = {
          id: p.tag || `sw-push-${Date.now()}`,
          title: p.title,
          message: p.body,
          created_at: new Date().toISOString(),
          is_read: false,
        }
        // Play sound and show modal popup (notification already shown as lock screen by SW)
        playAlertSound()
        vibratePhone()
        setIncomingAlert(alert)
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)

    // 📻 Realtime Walkie-Talkie Radio Listener Across All App Pages
    const handleIncomingRadio = (tx: any) => {
      if (typeof window === 'undefined' || !tx) return
      // If currently on dedicated walkie-talkie page, let WalkieTalkieWidget handle playback
      if (window.location.pathname.includes('/walkie-talkie')) return

      let myId = ''
      try {
        const saved = localStorage.getItem('muve_user')
        if (saved) myId = JSON.parse(saved).id || ''
      } catch {}

      if (tx.sender_id === myId) return

      soundEngine.unlockAudio()
      soundEngine.playIncomingTransmissionAlert()
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 60, 100])
      }

      toast.info(`📻 [${tx.sender_callsign}] Radio: ${tx.code_text || 'Incoming Voice...'}`, {
        duration: 5000,
        action: {
          label: 'OPEN RADIO',
          onClick: () => {
            window.location.href = window.location.pathname.startsWith('/admin')
              ? '/admin/walkie-talkie'
              : '/app/walkie-talkie'
          },
        },
      })

      if (tx.audio_base64) {
        setTimeout(() => {
          try {
            const audio = new Audio(tx.audio_base64)
            audio.volume = 0.9
            audio.onended = () => {
              soundEngine.playRogerBeep()
            }
            audio.play().catch(() => {})
          } catch {}
        }, 220)
      } else if (tx.code_text && 'speechSynthesis' in window) {
        setTimeout(() => {
          try {
            window.speechSynthesis.cancel()
            const u = new SpeechSynthesisUtterance(`${tx.sender_callsign}: ${tx.code_text}`)
            u.rate = 1.05
            u.pitch = 0.95
            u.onend = () => soundEngine.playRogerBeep()
            window.speechSynthesis.speak(u)
          } catch {}
        }, 220)
      }
    }

    let radioBc: BroadcastChannel | null = null
    try {
      if ('BroadcastChannel' in window) {
        radioBc = new BroadcastChannel('muve_walkie_talkie_bus')
        radioBc.onmessage = (event) => {
          if (event.data?.type === 'NEW_TRANSMISSION' && event.data.transmission) {
            handleIncomingRadio(event.data.transmission)
          }
        }
      }
    } catch {}

    const radioSbChan = supabase.channel('muve_radio_global_ch1', {
      config: { broadcast: { self: false } },
    })
    radioSbChan
      .on('broadcast', { event: 'tx' }, ({ payload }) => {
        if (payload) handleIncomingRadio(payload)
      })
      .subscribe()

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
      if (radioBc) radioBc.close()
      supabase.removeChannel(radioSbChan)
    }
  }, [subscribeToPush, playAlertSound, vibratePhone])

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
        const reg = swReg || ('serviceWorker' in navigator ? await navigator.serviceWorker.ready : null)
        if (reg) {
          await subscribeToPush(reg)
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

  const getCurrentUserId = useCallback(() => {
    try {
      const saved = localStorage.getItem('muve_user')
      if (saved) {
        const u = JSON.parse(saved)
        return u.id === 'usr_user_001' ? '00000000-0000-0000-0000-000000000002' : u.id
      }
    } catch (e) {}
    return '00000000-0000-0000-0000-000000000002'
  }, [])

  // 8. Handle Incoming Alert Detection (Realtime + Polling fallback)
  const handleNewAlert = useCallback(
    (alert: {
      id?: string
      title: string
      message: string
      created_at?: string
      is_read?: boolean
      target_user_id?: string
      user_id?: string
    }) => {
      // NEVER trigger alerts for already-done or read tasks
      if (alert.is_read) return

      // If targeted to a specific staff member, only display if it matches current user
      const target = alert.target_user_id || alert.user_id
      if (target && target !== 'all') {
        const currentId = getCurrentUserId()
        const normTarget = target === 'usr_user_001' ? '00000000-0000-0000-0000-000000000002' : target
        if (currentId !== normTarget) {
          return
        }
      }

      const alertId = alert.id || `${alert.title}_${alert.created_at || Date.now()}`
      if (seenAlertIdsRef.current.has(alertId)) return

      seenAlertIdsRef.current.add(alertId)
      saveSeenIds()

      // Trigger lock screen notification, vibration, and loud audio
      triggerLockScreenNotification(alert.title, alert.message, '/app/tasks', alertId)

      // Set in-app floating emergency banner
      setIncomingAlert(alert)
    },
    [triggerLockScreenNotification, saveSeenIds, getCurrentUserId]
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
            // Only fire for unread and non-scan notifications
            if (notif && notif.type !== 'scan' && !notif.is_read) {
              handleNewAlert(notif)
            }
          }
        )
        .subscribe()
    } catch (e) {}

    // Polling fallback to ensure zero missed notifications
    const RECENT_THRESHOLD_MS = 30 * 1000 // 30 seconds — seed only older ones
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications?t=${Date.now()}`, { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.notifications)) {
          // On first load: mark OLD notifications as seen so they don't popup retroactively.
          // BUT leave recent ones (< 30s old) unblocked so they still fire.
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false
            const now = Date.now()
            for (const n of json.notifications) {
              const id = n.id || n.title
              const age = n.created_at ? now - new Date(n.created_at).getTime() : Infinity
              // Only pre-seed if notification is older than 30 seconds
              if (age > RECENT_THRESHOLD_MS) {
                seenAlertIdsRef.current.add(id)
              }
            }
            saveSeenIds()
            // Don't return — still process any recent ones below
          }

          // Process unread non-scan notifications
          const unreadAlerts = json.notifications
            .slice(0, 15)
            .filter((n: any) => n.type !== 'scan' && !n.is_read)

          for (const alert of unreadAlerts) {
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
          if (ev.data && ev.data.alert && !ev.data.alert.is_read) {
            handleNewAlert(ev.data.alert)
          }
        }
      }
    } catch (e) {}

    const onCustomAlert = (ev: any) => {
      if (ev.detail && !ev.detail.is_read) {
        handleNewAlert(ev.detail)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('muve-trigger-alert-popup', onCustomAlert)
    }

    // Periodic patrol check according to office shift rules (every 45s)
    const patrolInterval = setInterval(async () => {
      try {
        const currentId = getCurrentUserId()
        await fetch(`/api/patrol/dispatch?userId=${currentId}`, { method: 'POST', cache: 'no-store' })
      } catch (e) {}
    }, 45000)

    // Trigger immediate check on mount (after 3s)
    const initialPatrolTimer = setTimeout(async () => {
      try {
        const currentId = getCurrentUserId()
        await fetch(`/api/patrol/dispatch?userId=${currentId}`, { method: 'POST', cache: 'no-store' })
      } catch (e) {}
    }, 3000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(patrolInterval)
      clearTimeout(initialPatrolTimer)
      if (channel) supabase.removeChannel(channel)
      if (bc) bc.close()
      if (typeof window !== 'undefined') {
        window.removeEventListener('muve-trigger-alert-popup', onCustomAlert)
      }
    }
  }, [handleNewAlert, saveSeenIds, getCurrentUserId])

  // Helper to parse title and message details
  const parsedReport = incomingAlert
    ? (() => {
        const isCheckpoint =
          incomingAlert.title?.includes('Checkpoint') ||
          incomingAlert.title?.includes('📍') ||
          incomingAlert.title?.includes('Patrol')
        const isTask =
          isCheckpoint ||
          incomingAlert.type === 'task' ||
          incomingAlert.title?.includes('Task') ||
          incomingAlert.title?.includes('📋')
        const isReport =
          !isCheckpoint &&
          (incomingAlert.title?.includes('Report') || incomingAlert.title?.includes('🚨'))

        let category = isCheckpoint
          ? 'CHECKPOINT PATROL'
          : isTask
          ? 'TASK DISPATCH'
          : isReport
          ? 'INCIDENT REPORT'
          : 'NOTIFICATION'
        let location = incomingAlert.title || 'MUVE Security System'
        let details = incomingAlert.message || ''
        let reporter = isCheckpoint ? 'Automated Patrol' : isReport ? 'Public Visitor' : 'System Admin'
        let priority = 'HIGH'

        if (incomingAlert.title) {
          const match = incomingAlert.title.match(/(?:Report:\s*)?([A-Za-z0-9_-]+)\s+at\s+(.+)$/i)
          if (match) {
            category = match[1].toUpperCase()
            location = match[2]
          } else {
            location = incomingAlert.title
              .replace(/^🚨\s*(?:Public Report:\s*)?/, '')
              .replace(/^📋\s*(?:Task:\s*)?/, '')
              .replace(/^📍\s*(?:Checkpoint:\s*)?/, '')
          }
        }

        if (incomingAlert.message) {
          const repMatch = incomingAlert.message.match(/^(.+?)\s+reported:\s+(.+?)(?:\s*\(([A-Z]+)\))?$/i)
          if (repMatch) {
            reporter = repMatch[1]
            details = repMatch[2]
            if (repMatch[3]) priority = repMatch[3]
          }
        }

        return {
          isCheckpoint,
          isTask,
          isReport,
          category,
          location,
          details,
          reporter,
          priority,
          time: incomingAlert.created_at
            ? new Date(incomingAlert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now',
        }
      })()
    : null

  return (
    <>
      {/* ============================================================
          1. RICH EMERGENCY INCIDENT POPUP MODAL (When a report arrives)
          ============================================================ */}
      {incomingAlert && parsedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#0F1E36] via-[#091527] to-[#040B14] border-2 border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.35)] overflow-hidden text-white animate-in zoom-in-95 duration-200">
            {/* Top Red Glow Accent & Pulsing Light */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse" />

            <div className="p-6">
              {/* Header Bar */}
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  {parsedReport.isTask ? 'NEW TASK DISPATCHED' : parsedReport.isReport ? 'INCIDENT ALERT DISPATCHED' : 'SYSTEM NOTIFICATION'}
                </span>

                <button
                  onClick={() => setIncomingAlert(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Siren Icon with Location Details */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/40 flex-shrink-0 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-700/60">
                      {parsedReport.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {parsedReport.time}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 leading-snug">
                    {parsedReport.location}
                  </h3>
                </div>
              </div>

              {/* Report Details Box */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{parsedReport.isTask ? 'Assigned by:' : 'Source:'}</span>
                  </span>
                  <span className="font-bold text-white text-xs">{parsedReport.reporter}</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    {parsedReport.isTask ? 'Task Instructions / Details:' : 'Issue Details:'}
                  </p>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium bg-black/40 p-2.5 rounded-xl border border-white/5">
                    {parsedReport.details}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {parsedReport.isCheckpoint ? (
                  <a
                    href="/app/scan"
                    onClick={() => setIncomingAlert(null)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 stroke-[2.5]" />
                    <span>Scan Checkpoint Now</span>
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      const alertId = incomingAlert.id
                      try {
                        await fetch('/api/todos', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: alertId,
                            title: incomingAlert.title,
                            status: 'completed',
                          }),
                        })
                        toast.success('Incident marked as resolved & completed!')
                        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                          const bc = new BroadcastChannel('muve_todos_bus')
                          bc.postMessage({ type: 'TODO_UPDATED' })
                          bc.close()
                        }
                      } catch (e) {
                        console.warn('Error resolving alert:', e)
                      }
                      setIncomingAlert(null)
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Mark as Resolved & Complete</span>
                  </button>
                )}

                <a
                  href="/app/tasks"
                  onClick={() => setIncomingAlert(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4FC04] via-lime-400 to-[#D4FC04] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#D4FC04]/20 hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>Open Task Checklist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => setIncomingAlert(null)}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Acknowledge & Dismiss</span>
                </button>
              </div>
            </div>
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
