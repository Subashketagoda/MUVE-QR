'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import {
  QrCode,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Download,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare,
  Check,
  Plus,
  Bell,
  BellRing,
  ShieldAlert,
  Volume2,
  VolumeX,
  PhoneCall,
  Siren,
  Radio,
  X,
} from 'lucide-react'
import { TodoRow } from '@/types/database'
import { toast } from 'sonner'
import { soundEngine } from '@/lib/sounds'

export default function UserHomePage() {
  const [user, setUser] = useState<any>(null)
  const [scansToday, setScansToday] = useState(0)
  const [lastScan, setLastScan] = useState<any>(null)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sosActive, setSosActive] = useState(false)
  const [sosGps, setSosGps] = useState<{ lat: number; lng: number } | null>(null)
  const [isHoldingSos, setIsHoldingSos] = useState(false)
  const [sosHoldProgress, setSosHoldProgress] = useState(0)
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(5)
  const holdIntervalRef = useRef<any>(null)
  const holdStartRef = useRef<number>(0)

  useEffect(() => {
    // Read logged in user from localStorage
    const saved = localStorage.getItem('muve_user')
    let currentUsr = { id: '00000000-0000-0000-0000-000000000002', full_name: 'User 01', phone: '077 111 1111', role: 'user' }
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.id === 'usr_user_001') {
          parsed.id = '00000000-0000-0000-0000-000000000002'
          localStorage.setItem('muve_user', JSON.stringify(parsed))
        }
        currentUsr = parsed
      } catch (e) {}
    }
    setUser(currentUsr)
    fetchUserScans(currentUsr.id)
    fetchUserTodos(currentUsr.id)
    fetchCheckpoints()

    // BroadcastChannel sync across tabs
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('muve_todos_bus')
        bc.onmessage = () => {
          fetchUserTodos(currentUsr.id)
          fetchCheckpoints()
        }
      }
    } catch (e) {}

    // Fast polling interval
    const interval = setInterval(() => {
      fetchUserTodos(currentUsr.id)
    }, 3000)

    const onFocus = () => {
      fetchUserTodos(currentUsr.id)
      fetchCheckpoints()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const fetchCheckpoints = async () => {
    try {
      const res = await fetch('/api/qr-codes', { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.qrCodes)) {
        setCheckpoints(data.qrCodes.filter((q: any) => q.status === 'active'))
      }
    } catch (e) {
      console.warn('Error fetching checkpoints:', e)
    }
  }

  const fetchUserTodos = async (userId: string) => {
    try {
      const res = await fetch(`/api/todos?userId=${userId}&t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.todos)) {
        setTodos(data.todos.slice(0, 4))
        localStorage.setItem('muve_local_todos', JSON.stringify(data.todos))
      }
    } catch (e) {
      try {
        const local = JSON.parse(localStorage.getItem('muve_local_todos') || '[]')
        setTodos(local.slice(0, 4))
      } catch (err) {}
    }
  }

  const handleToggleTodo = async (todo: TodoRow) => {
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed'
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t))
    )
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('muve_todos_bus')
        bc.postMessage({ type: 'TODO_UPDATED' })
        bc.close()
      }
    } catch (e) {}

    try {
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todo.id, title: todo.title, status: nextStatus }),
      })
      if (nextStatus === 'completed') {
        toast.success('Task marked as completed!')
      } else {
        toast.info('Task marked as pending')
      }
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('muve_todos_bus')
        bc.postMessage({ type: 'TODO_UPDATED' })
        bc.close()
      }
    } catch (e) {
      console.error('Error updating todo:', e)
    }
  }

  const fetchUserScans = async (userId: string) => {
    let localList: any[] = []
    try {
      localList = JSON.parse(localStorage.getItem('muve_local_scans') || '[]')
      if (localList.length > 0) {
        setRecentScans(localList.slice(0, 5))
        setLastScan(localList[0])
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const count = localList.filter((s: any) => new Date(s.scanned_at) >= todayStart).length
        setScansToday(count)
      }
    } catch (e) {}

    try {
      const targetUserId = (userId === 'usr_user_001' || !userId) ? '00000000-0000-0000-0000-000000000002' : userId
      const res = await fetch(`/api/scans?userId=${targetUserId}&limit=20`)
      const json = await res.json()
      if (json.success && json.scans) {
        const serverList = json.scans
        const map = new Map()
        localList.forEach((s: any) => map.set(s.id, s))
        serverList.forEach((s: any) => map.set(s.id, s))
        const combined = Array.from(map.values()).sort(
          (a: any, b: any) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
        )

        setRecentScans(combined.slice(0, 5))
        if (combined.length > 0) {
          setLastScan(combined[0])
        }
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const count = combined.filter((s: any) => new Date(s.scanned_at) >= todayStart).length
        setScansToday(count)

        localStorage.setItem('muve_local_scans', JSON.stringify(combined.slice(0, 100)))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleTestLockScreenAlert = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const res = await Notification.requestPermission()
        if (res !== 'granted') {
          toast.info('Please allow notification permission to test lock screen alerts.')
          return
        }
      }
    }

    // Ensure Push Subscription is actively registered to Supabase backend
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          const res = await fetch('/api/push/subscribe')
          const data = await res.json()
          if (data.publicKey) {
            const padding = '='.repeat((4 - (data.publicKey.length % 4)) % 4)
            const base64 = (data.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
            const rawData = window.atob(base64)
            const outputArray = new Uint8Array(rawData.length)
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i)
            }
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: outputArray,
            })
          }
        }
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, userId: user?.id || 'staff' }),
          })
        }
      } catch (e) {
        console.warn('Subscription registration error:', e)
      }
    }

    toast.info('Lock Alert dispatched! Lock your phone screen NOW to test (3s timer).', { duration: 5000 })

    // 0. Trigger the gorgeous Incident Popup Modal immediately on screen
    window.dispatchEvent(
      new CustomEvent('muve-trigger-alert-popup', {
        detail: {
          id: `test_${Date.now()}`,
          title: '🚨 Public Report: PLUMBING at 01st Floor - Ladies Washroom',
          message: 'Visitor (Kasun Perera) reported: Water overflow from sink tap, floor is slippery. (HIGH)',
          created_at: new Date().toISOString(),
        },
      })
    )

    // 1. Direct Service Worker notification
    setTimeout(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_LOCKSCREEN_NOTIFICATION',
          title: '🚨 TEST REPORT: 01st Floor - Ladies Washroom',
          body: 'Visitor reported: Water leakage near sink (HIGH PRIORITY) — Lock Screen Alert Test',
          data: { url: '/app/tasks' },
        })
      }
      try {
        if ('vibrate' in navigator) navigator.vibrate([400, 200, 400, 200, 600])
      } catch (e) {}
    }, 2500)

    // 2. Real Server Web Push to wake up locked phone from sleep/background
    setTimeout(async () => {
      try {
        await fetch('/api/push/test', { method: 'POST' })
      } catch (e) {}
    }, 3000)
  }

  // -------------------------------------------------------------
  // 🚨 SUPIRI TACTICAL SOS EMERGENCY TRIGGER
  // -------------------------------------------------------------
  const handleTriggerSOS = () => {
    soundEngine.startSOSSiren()
    setSosActive(true)

    if ('vibrate' in navigator) {
      navigator.vibrate([600, 150, 600, 150, 800, 200, 1000])
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6))
          const lng = Number(pos.coords.longitude.toFixed(6))
          setSosGps({ lat, lng })
          dispatchSOSIncident(lat, lng)
        },
        () => {
          dispatchSOSIncident(null, null)
        },
        { enableHighAccuracy: true, timeout: 6000 }
      )
    } else {
      dispatchSOSIncident(null, null)
    }

    toast.error('🚨 CRITICAL SOS ACTIVATED! EMERGENCY SIREN SOUNDING!', { duration: 6000 })
  }

  const dispatchSOSIncident = async (lat: number | null, lng: number | null) => {
    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🚨 CRITICAL SOS: Officer Needs Immediate Assistance!`,
          category: 'security',
          severity: 'critical',
          location_name: lastScan?.location_name || 'Field Patrol / On Duty',
          description: `EMERGENCY SOS PANIC BUTTON TRIGGERED BY ${user?.full_name || 'Guard'} (${user?.phone || 'No phone'}). Immediate backup required!`,
          reported_by_id: user?.id || 'usr_anonymous',
          reported_by_name: user?.full_name || 'Staff Officer',
          reported_by_phone: user?.phone || null,
          latitude: lat,
          longitude: lng,
        }),
      })
    } catch (e) {
      console.warn('Failed to dispatch SOS report:', e)
    }
  }

  const handleStopSOS = () => {
    soundEngine.stopSOSSiren()
    setSosActive(false)
    toast.info('SOS Siren Silenced.')
  }

  // -------------------------------------------------------------
  // 🛡️ 5-SECOND SAFETY HOLD LOGIC (PREVENTS ACCIDENTAL PRESSES)
  // -------------------------------------------------------------
  const startSosHold = (e: React.SyntheticEvent) => {
    e.preventDefault()
    setIsHoldingSos(true)
    setSosHoldProgress(0)
    setHoldSecondsLeft(5)
    holdStartRef.current = Date.now()

    if ('vibrate' in navigator) {
      navigator.vibrate(60)
    }

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current)

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min((elapsed / 5000) * 100, 100)
      const remainingSec = Math.max(Math.ceil((5000 - elapsed) / 1000), 0)

      setSosHoldProgress(progress)
      setHoldSecondsLeft(remainingSec)

      // Light haptic tick on each countdown second
      if (remainingSec < 5 && remainingSec > 0 && Math.floor(elapsed / 1000) !== Math.floor((elapsed - 50) / 1000)) {
        if ('vibrate' in navigator) navigator.vibrate(80)
      }

      if (elapsed >= 5000) {
        clearInterval(holdIntervalRef.current)
        holdIntervalRef.current = null
        setIsHoldingSos(false)
        setSosHoldProgress(0)
        handleTriggerSOS()
      }
    }, 40)
  }

  const cancelSosHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    if (isHoldingSos) {
      const elapsed = Date.now() - holdStartRef.current
      setIsHoldingSos(false)
      if (elapsed > 400 && elapsed < 4800) {
        toast.info('SOS Cancelled. Hold firmly for full 5 seconds to activate.', { duration: 3000 })
      }
      setSosHoldProgress(0)
      setHoldSecondsLeft(5)
    }
  }

  // -------------------------------------------------------------
  // Calculate Next Pending Checkpoint & Tour Progress
  // -------------------------------------------------------------
  const pendingTodo = todos.find(
    (t) =>
      t.status === 'pending' &&
      (t.assigned_by === 'Automated Patrol Dispatch' ||
        t.title.includes('📍 Checkpoint') ||
        t.title.includes('Checkpoint:'))
  )

  const todayScannedLocations = new Set(
    recentScans
      .filter((s) => {
        const d = new Date(s.scanned_at)
        const now = new Date()
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      })
      .map((s) => (s.location_name || s.qr_name || '').toLowerCase().trim())
  )

  const unscannedCatalogPoints = checkpoints.filter(
    (cp) =>
      !todayScannedLocations.has((cp.location_name || cp.name || '').toLowerCase().trim())
  )

  const nextPendingPoint = pendingTodo
    ? {
        id: pendingTodo.id,
        location_name: pendingTodo.title.replace(/^📍\s*(?:Checkpoint:\s*)?/, ''),
        name: pendingTodo.title.replace(/^📍\s*(?:Checkpoint:\s*)?/, ''),
        description: pendingTodo.description || 'Assigned patrol inspection checkpoint',
        isTodo: true,
      }
    : unscannedCatalogPoints.length > 0
    ? unscannedCatalogPoints[0]
    : null

  const totalCheckpoints = Math.max(checkpoints.length, 1)
  const scannedCountToday = Math.min(scansToday, totalCheckpoints)
  const progressPct = Math.round((scannedCountToday / totalCheckpoints) * 100)
  const otherPendingCount = Math.max(
    (pendingTodo
      ? todos.filter((t) => t.status === 'pending').length - 1
      : unscannedCatalogPoints.length - 1),
    0
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Premium Hero Header with Mobile Status Bar Safe Area */}
      <div
        className="bg-gradient-to-b from-[#051824] via-[#072B3B] to-[#0a384d] text-white p-6 rounded-b-[32px] shadow-xl relative overflow-hidden"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.85rem), 3rem)' }}
      >
        {/* Background glow orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4FC04]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Bar with Logo and Status */}
          <div className="flex items-center justify-between">
            <Logo size="sm" showSubtitle={true} subtitleText="QR SYSTEM" variant="dark" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Ready</span>
              </div>
              {/* 🚨 5-SEC HOLD SOS BUTTON */}
              <div className="relative select-none">
                <button
                  type="button"
                  onPointerDown={startSosHold}
                  onPointerUp={cancelSosHold}
                  onPointerLeave={cancelSosHold}
                  onTouchStart={startSosHold}
                  onTouchEnd={cancelSosHold}
                  onTouchCancel={cancelSosHold}
                  onMouseDown={startSosHold}
                  onMouseUp={cancelSosHold}
                  onMouseLeave={cancelSosHold}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`relative overflow-hidden px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer select-none ${
                    isHoldingSos
                      ? 'bg-red-700 text-white border-white scale-105 shadow-[0_0_25px_rgba(239,68,68,1)] ring-2 ring-white'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-300 shadow-[0_0_16px_rgba(225,29,72,0.7)] animate-pulse'
                  }`}
                  style={{ touchAction: 'none' }}
                  title="Hold for 5 seconds to activate Emergency SOS"
                >
                  {/* Visual 5-Second Fill Bar */}
                  <div
                    className="absolute inset-0 bg-white/40 pointer-events-none transition-all duration-75"
                    style={{ width: `${sosHoldProgress}%` }}
                  />

                  <ShieldAlert
                    className={`w-3.5 h-3.5 relative z-10 ${
                      isHoldingSos ? 'animate-bounce text-white' : ''
                    }`}
                  />
                  <span className="relative z-10 whitespace-nowrap">
                    {isHoldingSos ? `HOLD ${holdSecondsLeft}s` : 'HOLD SOS (5s)'}
                  </span>
                </button>

                {/* Floating Tooltip Pill during Hold */}
                {isHoldingSos && (
                  <div className="absolute -bottom-8 right-0 bg-black/95 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-red-500 shadow-xl whitespace-nowrap z-30 animate-in fade-in">
                    Hold for 5s: {holdSecondsLeft}s left...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Welcome Greeting */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                Welcome back
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                {user?.full_name || 'User 01'}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {user?.phone || '077 111 1111'}
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#D4FC04] p-0.5 shadow-lg">
              <div className="w-full h-full rounded-[14px] bg-[#072B3B] flex items-center justify-center text-white font-black text-base">
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U1'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ============================================================ */}
        {/* 📍 GIANT PROMINENT PENDING SCAN POINT HERO CARD */}
        {/* ============================================================ */}
        {nextPendingPoint ? (
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0c233c] via-[#091b2e] to-[#05111f] border-2 border-amber-400/80 shadow-[0_15px_45px_rgba(245,158,11,0.28)] text-white p-5 space-y-4">
            {/* Ambient High-Tech Glow */}
            <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Status Pill & Checkpoint Number */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 shadow-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  ⚡ PENDING CHECKPOINT SCAN
                </span>
              </div>

              <span className="text-[11px] font-mono font-extrabold text-amber-200 bg-black/60 px-2.5 py-1 rounded-xl border border-amber-400/30">
                {scannedCountToday + 1} of {totalCheckpoints}
              </span>
            </div>

            {/* Huge Point Title */}
            <div className="relative z-10 space-y-1 pt-1">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-[#D4FC04] text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-400/30 mt-0.5">
                  <MapPin className="w-7 h-7 stroke-[2.5] animate-bounce" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-amber-300/90 uppercase tracking-widest">
                    Next Target Location
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight break-words">
                    {nextPendingPoint.location_name || nextPendingPoint.name}
                  </h2>
                  {nextPendingPoint.description && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {nextPendingPoint.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tour Progress Gauge */}
            <div className="relative z-10 space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Patrol Tour Progress</span>
                </span>
                <span className="text-amber-300 font-mono font-extrabold">
                  {scannedCountToday} / {totalCheckpoints} Completed ({progressPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/15 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-[#D4FC04] to-emerald-400 rounded-full transition-all duration-500 shadow-md"
                  style={{ width: `${Math.max(progressPct, 6)}%` }}
                />
              </div>
            </div>

            {/* GIANT SCAN ACTION BUTTON */}
            <Link
              href="/app/scan"
              className="relative z-10 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#D4FC04] via-amber-300 to-[#D4FC04] text-slate-950 font-black text-base tracking-wide uppercase flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,252,4,0.4)] active:scale-95 transition transform group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#D4FC04] flex items-center justify-center group-hover:rotate-12 transition-transform shadow">
                <QrCode className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-slate-950 font-black tracking-tight text-base sm:text-lg">
                SCAN THIS CHECKPOINT
              </span>
              <ChevronRight className="w-5 h-5 stroke-[3] group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Other Pending Checkpoints Queue note */}
            {otherPendingCount > 0 && (
              <div className="relative z-10 pt-1 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10">
                <span className="text-slate-400">
                  + {otherPendingCount} more checkpoints in queue
                </span>
                <Link href="/app/tasks" className="text-amber-300 hover:underline font-bold flex items-center gap-0.5">
                  <span>View Tour List</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[28px] bg-gradient-to-br from-emerald-950/80 via-slate-900 to-[#072B3B] border border-emerald-500/40 p-5 text-white shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  All Checkpoints Up to Date
                </span>
                <h3 className="text-lg font-black text-white">Patrol Route Complete</h3>
                <p className="text-xs text-slate-300">All registered checkpoints scanned today.</p>
              </div>
            </div>
            <Link
              href="/app/scan"
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              <QrCode className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Report Incident / Hazard Emergency Banner */}
        <Link
          href="/app/incidents"
          className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white shadow-lg border border-rose-500/30 flex items-center justify-between active:scale-[0.98] transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white px-1.5 py-0.5 rounded">
                  Hazard
                </span>
                <span className="text-xs font-bold text-rose-200">Incident & Damage</span>
              </div>
              <h4 className="text-base font-black text-white tracking-tight mt-0.5">
                REPORT AN INCIDENT
              </h4>
              <p className="text-[11px] text-slate-300">Attach live camera photo & GPS location</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition text-white">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Dynamic Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Scans */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Scans
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : scansToday}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified in Cloud</span>
              </p>
            </div>
          </div>

          {/* Last Scan */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Last Activity
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            {lastScan ? (
              <div className="min-w-0">
                <p className="font-extrabold text-xs text-slate-900 truncate">
                  {lastScan.qr_name} • {lastScan.location_name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  {new Date(lastScan.scanned_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">No scans yet today</p>
            )}
          </div>
        </div>

        {/* Android Native APK Download Card */}
        <Link
          href="/download"
          className="p-4 rounded-2xl bg-gradient-to-r from-[#051824] to-[#0c3144] text-white border border-white/10 shadow-md flex items-center justify-between group active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4FC04]/15 border border-[#D4FC04]/30 flex items-center justify-center text-[#D4FC04]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-white">Android Mobile App</h4>
                <span className="text-[9px] font-extrabold bg-[#D4FC04] text-black px-1.5 py-0.2 rounded">
                  v1.0.2
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Download native APK or install shortcut</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#D4FC04] group-hover:translate-x-0.5 transition-transform">
            <Download className="w-4 h-4" />
          </div>
        </Link>

        {/* Lock Screen & Audio Alerts Status Widget */}
        <div className="bg-gradient-to-r from-slate-900 to-[#072B3B] text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white truncate">Lock Screen Alerts</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
              </div>
              <p className="text-[10px] text-slate-300 truncate">Instant vibration & sound for visitor reports</p>
            </div>
          </div>
          <button
            onClick={handleTestLockScreenAlert}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-[#D4FC04] text-[11px] font-black rounded-lg border border-white/15 transition cursor-pointer flex-shrink-0 active:scale-95"
          >
            Test Alert
          </button>
        </div>

        {/* User Daily Checklist / To-Do Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs">Daily Checklist & Tasks</h3>
                <p className="text-[10px] text-slate-400">Admin verified inspection tasks</p>
              </div>
            </div>
            <Link
              href="/app/tasks"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
            >
              <span>Open List</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {todos.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-medium">No tasks logged yet</p>
              <Link
                href="/app/tasks"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-1"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Add first task</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => {
                const isDone = todo.status === 'completed'
                return (
                  <div
                    key={todo.id}
                    onClick={() => handleToggleTodo(todo)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition flex-shrink-0 ${
                          isDone
                            ? 'bg-blue-600 text-white'
                            : 'border-2 border-slate-300'
                        }`}
                      >
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {todo.title}
                          </span>
                          {todo.assigned_by && (
                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1 py-0.2 rounded border border-blue-200 flex-shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {todo.admin_reviewed ? (
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          ✓ Admin Checked
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">
                          {isDone ? 'Done' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Scans Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Scans</h3>
            </div>
            <Link
              href="/app/history"
              className="text-xs text-blue-600 font-bold flex items-center gap-0.5 hover:underline"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-100 shadow-sm space-y-2">
              <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No recent scan history</p>
              <p className="text-[11px]">Tap the blue button above to scan your first checkpoint.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100/90 shadow-xs flex items-center justify-between hover:border-blue-200 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-xs truncate">
                        {s.qr_name || 'Checkpoint'}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{s.location_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                      Success
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(s.scanned_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🚨 TACTICAL FULL-SCREEN SOS PANIC OVERLAY */}
      {/* ============================================================ */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-rose-950 via-red-950 to-black text-white flex flex-col justify-between p-6 animate-in fade-in duration-200">
          {/* Strobe background flashing animation */}
          <div className="absolute inset-0 bg-red-600/15 pointer-events-none animate-pulse" />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/30 border border-red-400 text-red-200 text-xs font-black uppercase tracking-widest animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
              <span>EMERGENCY SOS ACTIVE</span>
            </div>
            <button
              onClick={handleStopSOS}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Center Siren Strobe Visualizer */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4 my-auto">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-rose-600/40 blur-3xl animate-ping" />
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border-4 border-white flex items-center justify-center shadow-[0_0_60px_rgba(225,29,72,0.9)] animate-bounce">
                <Siren className="w-14 h-14 text-white stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight text-white uppercase">
                POLICE & CONTROL ROOM ALERTED
              </h2>
              <p className="text-sm font-bold text-rose-300">
                Loud Tactical Siren Sounding • GPS Broadcast Live
              </p>
            </div>

            {/* Live GPS badge */}
            <div className="px-4 py-2 rounded-2xl bg-black/60 border border-red-500/40 text-xs font-mono text-rose-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>
                {sosGps
                  ? `GPS: ${sosGps.lat}° N, ${sosGps.lng}° E (Live Broadcast)`
                  : 'Acquiring high-precision GPS...'}
              </span>
            </div>
          </div>

          {/* Bottom Actions: Emergency One-Tap Call & Silence */}
          <div className="relative z-10 space-y-3 pb-6">
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="tel:119"
                className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 119 (Police)</span>
              </a>
              <a
                href="tel:1990"
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 1990 (Ambulance)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={handleStopSOS}
              className="w-full py-4 rounded-2xl bg-white hover:bg-slate-200 text-black font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition cursor-pointer"
            >
              <VolumeX className="w-5 h-5 text-red-600" />
              <span>SILENCE SIREN & CANCEL SOS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
