'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Menu,
  Bell,
  LogOut,
  CheckCircle2,
  ChevronDown,
  Volume2,
  VolumeX,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationRow } from '@/types/database'
import { supabase } from '@/lib/supabase/client'

interface AdminTopNavProps {
  onMenuClick: () => void
}

export const AdminTopNav: React.FC<AdminTopNavProps> = ({ onMenuClick }) => {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const lastKnownIdRef = useRef<string | null>(null)
  const lastCheckTimeRef = useRef<number>(Date.now())

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Initialize sound preference & browser notification status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('muve_admin_sound')
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true')
      }
      if ('Notification' in window) {
        setBrowserPermission(Notification.permission)
      }
    }
  }, [])

  // Two-tone chime sound for new notifications
  const playNotificationChime = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // First pleasant chime note (G5 - 784Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(783.99, now)
      gain1.gain.setValueAtTime(0.15, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      // Second pleasant chime note (C6 - 1046Hz)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1046.5, now + 0.12)
      gain2.gain.setValueAtTime(0.18, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.5)
    } catch (e) {
      // Audio might be blocked by browser before user interaction
    }
  }

  // Native Browser push notification
  const showNativeNotification = (title: string, message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico',
          })
        } catch (e) {}
      }
    }
  }

  // Request browser permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission()
        setBrowserPermission(perm)
        if (perm === 'granted') {
          toast.success('Desktop notifications enabled!')
          playNotificationChime()
          showNativeNotification('MUVE QR', 'Desktop notifications are now active!')
        } else {
          toast.info('Desktop notifications were not enabled')
        }
      } catch (e) {}
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('muve_admin_sound', String(next))
    if (next) {
      playNotificationChime()
      toast.success('Notification sound turned ON')
    } else {
      toast.info('Notification sound muted')
    }
  }

  // Real-time listener + polling fallback
  useEffect(() => {
    fetchNotifications(true)

    // Supabase Realtime channel for instant push
    const channel = supabase
      .channel('admin-topnav-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as NotificationRow
          if (newNotif) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev
              return [newNotif, ...prev]
            })
            playNotificationChime()
            toast.info(`🔔 ${newNotif.title}`, {
              description: newNotif.message,
            })
            showNativeNotification(newNotif.title, newNotif.message)
            lastKnownIdRef.current = newNotif.id
            lastCheckTimeRef.current = Date.now()
          }
        }
      )
      .subscribe()

    // 4-second Polling fallback (ensures notifications work even if Realtime is not active)
    const interval = setInterval(() => {
      fetchNotifications(false)
    }, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [soundEnabled])

  const fetchNotifications = async (isInitial = false) => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success && data.notifications) {
        const freshList: NotificationRow[] = data.notifications

        if (!isInitial && freshList.length > 0 && lastKnownIdRef.current) {
          // Find any items newer than the last known ID that are unread
          const newItems = freshList.filter(
            (n) =>
              n.id !== lastKnownIdRef.current &&
              !n.is_read &&
              new Date(n.created_at).getTime() > lastCheckTimeRef.current - 1000
          )

          if (newItems.length > 0) {
            playNotificationChime()
            newItems.slice(0, 3).forEach((item) => {
              toast.info(`🔔 ${item.title}`, { description: item.message })
              showNativeNotification(item.title, item.message)
            })
          }
        }

        if (freshList.length > 0) {
          lastKnownIdRef.current = freshList[0].id
          lastCheckTimeRef.current = Date.now()
        }

        setNotifications(freshList)
      }
    } catch (e) {
      // Ignore background errors
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'all' }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (e) {
      toast.error('Failed to update notifications')
    }
  }

  const markSingleRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: true }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (e) {}
  }

  const sendTestNotification = async () => {
    setIsSendingTest(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'System alert & chime notification test successful!',
          type: 'alert',
        }),
      })
      const data = await res.json()
      if (data.success) {
        playNotificationChime()
        toast.success('Test notification sent!')
        showNativeNotification('MUVE QR', 'System alert & chime notification test successful!')
        fetchNotifications(false)
      }
    } catch (e) {
      toast.error('Failed to send test notification')
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('muve_user')
    document.cookie = 'muve_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time System Online</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Sound Quick Toggle Button */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Notification Sound: ON (Click to Mute)' : 'Notification Sound: OFF (Click to Unmute)'}
          className={`p-2 rounded-full transition ${
            soundEnabled
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
            }}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 relative transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={sendTestNotification}
                    disabled={isSendingTest}
                    className="text-[11px] text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition"
                    title="Send a test notification"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:underline font-semibold ml-2"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop Notification Prompt Banner */}
              {browserPermission !== 'granted' && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs">
                  <span className="text-blue-800 font-medium">🔔 Enable desktop push alerts</span>
                  <button
                    onClick={requestBrowserPermission}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                  >
                    Enable
                  </button>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Live scans and alerts will appear here</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleRead(n.id)}
                      className={`p-3 text-xs flex gap-3 cursor-pointer transition ${
                        !n.is_read
                          ? 'bg-blue-50/60 hover:bg-blue-50 font-medium'
                          : 'hover:bg-slate-50 opacity-80'
                      }`}
                    >
                      {n.type === 'alert' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              AD
            </div>
            <span className="hidden sm:inline font-medium text-xs text-slate-800">Admin</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">System Administrator</p>
                <p className="text-[11px] text-slate-500">admin@muveqr.app</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
