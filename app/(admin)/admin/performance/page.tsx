'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  Trophy,
  Crown,
  Medal,
  Radio,
  Clock,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Activity,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function AdminPerformancePage() {
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('today')
  const [isTvMode, setIsTvMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [perfData, setPerfData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [newScanFlash, setNewScanFlash] = useState(false)

  // Secondary tab & filters for the lower section
  const [subTab, setSubTab] = useState<'checkpoints' | 'analytics'>('checkpoints')
  const [checkpointSearch, setCheckpointSearch] = useState('')
  const [checkpointFilter, setCheckpointFilter] = useState<'all' | 'visited' | 'unvisited'>('all')

  const prevTopScanCountRef = useRef<number>(0)
  const tvContainerRef = useRef<HTMLDivElement>(null)

  // 1. Live Digital Clock (Updates every second for TV wall display)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Play gentle celebration chime when leaderboard changes
  const playLiveChime = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2) // D6
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)
    } catch (e) {}
  }

  // 3. Fetch Performance Analytics from API
  const fetchPerformance = async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('timeframe', timeframe)

      const res = await fetch(`/api/performance?${params.toString()}&t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.success) {
        // Check if top scans updated to trigger visual glow and sound
        const currentTopScans = data.officerLeaderboard?.[0]?.total_scans || 0
        if (!isInitial && currentTopScans > prevTopScanCountRef.current && prevTopScanCountRef.current > 0) {
          playLiveChime()
          setNewScanFlash(true)
          setTimeout(() => setNewScanFlash(false), 2500)
        }
        prevTopScanCountRef.current = currentTopScans

        setPerfData(data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Performance fetch error:', err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  // Initial load when timeframe changes
  useEffect(() => {
    fetchPerformance(true)
  }, [timeframe])

  // 4. Multi-Strategy Real-time Live Engine (Supabase Realtime + BroadcastChannel + 3s Poller)
  useEffect(() => {
    // A. Cross-tab instant message bus
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('muve_scans_bus')
        bc.onmessage = () => {
          fetchPerformance(false)
        }
      }
    } catch (e) {}

    // B. Supabase Realtime channel on scan_logs table
    let channel: any = null
    try {
      channel = supabase
        .channel('performance-live-tv')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scan_logs' },
          () => {
            fetchPerformance(false)
          }
        )
        .subscribe()
    } catch (e) {}

    // C. Continuous 3-second live background polling to guarantee 100% TV reliability
    const interval = setInterval(() => {
      fetchPerformance(false)
    }, 3000)

    return () => {
      if (bc) bc.close()
      if (channel) supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [timeframe, soundEnabled])

  // Fullscreen TV Mode Toggle
  const toggleFullscreen = () => {
    if (!isTvMode) {
      setIsTvMode(true)
      try {
        if (tvContainerRef.current && document.fullscreenEnabled) {
          tvContainerRef.current.requestFullscreen?.()
        }
      } catch (e) {}
    } else {
      setIsTvMode(false)
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen?.()
        }
      } catch (e) {}
    }
  }

  // Listen to browser Escape exit from fullscreen
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsTvMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Filtered checkpoints for lower heatmap section
  const filteredCheckpoints = useMemo(() => {
    if (!perfData?.checkpointStats) return []
    return perfData.checkpointStats.filter((c: any) => {
      const matchesSearch =
        c.location_name.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
        c.token.toLowerCase().includes(checkpointSearch.toLowerCase())

      if (!matchesSearch) return false
      if (checkpointFilter === 'visited') return c.visits > 0
      if (checkpointFilter === 'unvisited') return c.visits === 0
      return true
    })
  }, [perfData, checkpointSearch, checkpointFilter])

  // Export CSV
  const exportPerformanceCSV = () => {
    if (!perfData) return
    const rows = [
      ['MUVE QR Live Patrol TV Leaderboard', `Timeframe: ${timeframe}`, `Generated: ${new Date().toLocaleString()}`],
      [],
      ['Officer Leaderboard'],
      ['Rank', 'Officer Name', 'Contact', 'Total Scans', 'Distinct Checkpoints', 'Coverage %', 'Pace (mins)', 'Status', 'Last Location', 'Last Scan Time'],
      ...perfData.officerLeaderboard.map((o: any, idx: number) => [
        `#${idx + 1}`,
        o.full_name,
        o.phone || o.email,
        o.total_scans,
        o.distinct_checkpoints,
        `${o.coverage_pct}%`,
        o.avg_pace_minutes || 'N/A',
        o.total_scans > 0 ? 'Active' : 'Standby',
        o.last_scanned_location || 'N/A',
        o.last_scanned_at ? new Date(o.last_scanned_at).toLocaleString() : 'N/A',
      ]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `muve_tv_leaderboard_${timeframe}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Live Leaderboard exported as CSV!')
  }

  const kpis = perfData?.kpis || {
    complianceScore: 0,
    checkpointsCoveredCount: 0,
    totalCheckpoints: 53,
    coverageRate: 0,
    totalScans: 0,
    successRate: 100,
    avgPaceMinutes: 0,
  }

  const officers = perfData?.officerLeaderboard || []
  const top1 = officers[0]
  const top2 = officers[1]
  const top3 = officers[2]

  return (
    <div
      ref={tvContainerRef}
      className={`space-y-6 transition-all duration-300 ${
        isTvMode
          ? 'fixed inset-0 z-50 bg-[#050D1A] overflow-y-auto p-4 sm:p-8 text-white'
          : 'pb-16 text-slate-900'
      }`}
    >
      {/* ============================================================
          TOP TV LEADERBOARD COMMAND BAR (Large & High Contrast)
          ============================================================ */}
      <div
        className={`p-5 lg:p-7 rounded-3xl border transition-all ${
          newScanFlash
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-[#D4FC04] shadow-2xl shadow-[#D4FC04]/20'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-[#0A1628] border-slate-800 shadow-2xl'
        } text-white flex flex-col xl:flex-row xl:items-center justify-between gap-5`}
      >
        {/* Left Title & Live Pulse */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4FC04] text-slate-950 flex items-center justify-center font-black shadow-lg shadow-[#D4FC04]/30 flex-shrink-0">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE REAL-TIME FEED
              </span>

              {/* Live Digital Clock */}
              <div className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800/90 text-[#D4FC04] border border-slate-700 flex items-center gap-1.5 shadow-inner">
                <Clock className="w-3.5 h-3.5 text-[#D4FC04]" />
                <span>{currentTime || '10:00:00 PM'}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              OFFICER PATROL LEADERBOARD
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 font-medium">
              Real-time security patrol rankings, perimeter inspection velocity & checkpoint coverage
            </p>
          </div>
        </div>

        {/* Right Controls: Timeframe Pills & TV Screen Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector Pills */}
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 flex items-center gap-1 shadow-inner">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  timeframe === t.id
                    ? 'bg-[#D4FC04] text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Chime sound enabled' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => fetchPerformance(false)}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl transition-all"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Fullscreen TV Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            {isTvMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isTvMode ? 'Exit TV Mode' : '📺 TV Mode'}</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={exportPerformanceCSV}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl transition-all"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          SECTION 1: THE PODIUM SHOWCASE (TOP 3 CHAMPIONS)
          Giant cards easily visible on a wall-mounted TV screen
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* RANK #2 (Silver Medal - Left Podium) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-700/80 shadow-xl relative overflow-hidden flex flex-col justify-between order-2 md:order-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-bl-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-600 text-xs font-black uppercase tracking-wider">
                <Medal className="w-4 h-4 text-slate-300" />
                #2 Rank · Runner Up
              </span>
              <span className="text-2xl font-black text-slate-400">🥈 2nd</span>
            </div>

            {top2 ? (
              <>
                <h3 className="text-xl lg:text-2xl font-black text-white truncate">
                  {top2.full_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {top2.phone !== 'N/A' ? top2.phone : top2.email}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl lg:text-5xl font-black text-white">
                    {top2.total_scans}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Total Scans
                  </span>
                </div>

                {/* Coverage progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>{top2.distinct_checkpoints} of {kpis.totalCheckpoints} Points</span>
                    <span className="text-blue-400 font-black">{top2.coverage_pct}% Coverage</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-700"
                      style={{ width: `${top2.coverage_pct}%` }}
                    />
                  </div>
                </div>

                {top2.last_scanned_location && (
                  <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate">Last: {top2.last_scanned_location}</span>
                  </p>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm font-semibold">
                Awaiting officer check-in
              </div>
            )}
          </div>
        </div>

        {/* RANK #1 (GOLD CHAMPION - Center Stage - Tallest & Most Prominent) */}
        <div
          className={`bg-gradient-to-b from-[#0F2040] via-[#0A1628] to-[#050D1A] p-6 lg:p-7 rounded-3xl border-2 shadow-2xl relative overflow-hidden flex flex-col justify-between order-1 md:order-2 transform md:-translate-y-2 transition-all ${
            newScanFlash
              ? 'border-[#D4FC04] ring-4 ring-[#D4FC04]/40 scale-[1.02]'
              : 'border-[#D4FC04]/80 shadow-[#D4FC04]/10'
          }`}
        >
          {/* Glowing aura */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#D4FC04]/20 to-transparent rounded-bl-full pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#D4FC04] text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-[#D4FC04]/30">
                <Crown className="w-4 h-4 fill-slate-950" />
                #1 PATROL LEADER
              </span>
              <span className="text-3xl font-black text-[#D4FC04]">👑 1st</span>
            </div>

            {top1 ? (
              <>
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
                  {top1.full_name}
                </h2>
                <p className="text-xs text-[#D4FC04] font-mono font-bold mt-0.5">
                  {top1.phone !== 'N/A' ? top1.phone : top1.email}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl lg:text-6xl font-black text-[#D4FC04] tracking-tight">
                    {top1.total_scans}
                  </span>
                  <span className="text-xs text-slate-300 font-extrabold uppercase tracking-wider">
                    Total Scans Verified
                  </span>
                </div>

                {/* Coverage progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-200">
                    <span className="text-white font-extrabold">{top1.distinct_checkpoints} of {kpis.totalCheckpoints} Checkpoints</span>
                    <span className="text-[#D4FC04] font-black">{top1.coverage_pct}% Perimeter</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-[#D4FC04] to-[#D4FC04] rounded-full transition-all duration-700 shadow-md"
                      style={{ width: `${top1.coverage_pct}%` }}
                    />
                  </div>
                </div>

                {top1.last_scanned_location && (
                  <div className="mt-4 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-4 h-4 text-[#D4FC04] flex-shrink-0" />
                      <strong className="text-slate-200 truncate">{top1.last_scanned_location}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      ACTIVE
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm font-semibold">
                Waiting for first patrol scan
              </div>
            )}
          </div>
        </div>

        {/* RANK #3 (Bronze Medal - Right Podium) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-700/80 shadow-xl relative overflow-hidden flex flex-col justify-between order-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-700/10 rounded-bl-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-amber-200 border border-amber-800/40 text-xs font-black uppercase tracking-wider">
                <Medal className="w-4 h-4 text-amber-500" />
                #3 Rank · Third Place
              </span>
              <span className="text-2xl font-black text-amber-500">🥉 3rd</span>
            </div>

            {top3 ? (
              <>
                <h3 className="text-xl lg:text-2xl font-black text-white truncate">
                  {top3.full_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {top3.phone !== 'N/A' ? top3.phone : top3.email}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl lg:text-5xl font-black text-white">
                    {top3.total_scans}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Total Scans
                  </span>
                </div>

                {/* Coverage progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>{top3.distinct_checkpoints} of {kpis.totalCheckpoints} Points</span>
                    <span className="text-amber-400 font-black">{top3.coverage_pct}% Coverage</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${top3.coverage_pct}%` }}
                    />
                  </div>
                </div>

                {top3.last_scanned_location && (
                  <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="truncate">Last: {top3.last_scanned_location}</span>
                  </p>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm font-semibold">
                Awaiting officer check-in
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 2: COMPLETE REAL-TIME LEADERBOARD BOARD (Large TV Table)
          ============================================================ */}
      <div
        className={`rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isTvMode ? 'bg-[#0A1628] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Table Top Header Bar */}
        <div
          className={`p-5 lg:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isTvMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-black tracking-tight">
                FULL SQUAD STANDINGS & ACTIVITY ROSTER
              </h2>
              <p className="text-xs text-slate-400">
                Live auto-updating every 3 seconds · Last synced {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              AUTO-SYNC ON
            </span>
          </div>
        </div>

        {/* Large Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`text-xs font-black uppercase tracking-wider border-b ${
                  isTvMode
                    ? 'bg-slate-950/80 text-slate-400 border-slate-800'
                    : 'bg-slate-100/80 text-slate-500 border-slate-200'
                }`}
              >
                <th className="py-4 px-6 text-center w-20">Rank</th>
                <th className="py-4 px-6">Officer Name & Contact</th>
                <th className="py-4 px-6 text-center">Total Scans</th>
                <th className="py-4 px-6">Checkpoint Coverage</th>
                <th className="py-4 px-6 text-center">Coverage %</th>
                <th className="py-4 px-6">Current / Last Location</th>
                <th className="py-4 px-6 text-center">Patrol Status</th>
                <th className="py-4 px-6 text-center">Rating</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isTvMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
              {officers.length > 0 ? (
                officers.map((officer: any, idx: number) => {
                  const isGold = idx === 0 && officer.total_scans > 0
                  const isSilver = idx === 1 && officer.total_scans > 0
                  const isBronze = idx === 2 && officer.total_scans > 0

                  return (
                    <tr
                      key={officer.id}
                      className={`transition-colors ${
                        isGold
                          ? isTvMode ? 'bg-[#0F2040]/40 hover:bg-[#0F2040]/70' : 'bg-amber-50/60 hover:bg-amber-50'
                          : isTvMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-5 px-6 text-center font-black">
                        <span
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-sm ${
                            isGold
                              ? 'bg-[#D4FC04] text-slate-950 shadow-lg shadow-[#D4FC04]/30'
                              : isSilver
                              ? 'bg-slate-300 text-slate-950'
                              : isBronze
                              ? 'bg-amber-600 text-white'
                              : isTvMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Officer Profile */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center text-sm ${
                              isGold
                                ? 'bg-[#D4FC04] text-slate-950 shadow-md'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {officer.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-base lg:text-lg leading-tight">
                              {officer.full_name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {officer.phone !== 'N/A' ? officer.phone : officer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Total Scans Verified */}
                      <td className="py-5 px-6 text-center">
                        <span className="text-xl lg:text-2xl font-black text-[#D4FC04]">
                          {officer.total_scans}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Scans
                        </span>
                      </td>

                      {/* Checkpoint Coverage Bar */}
                      <td className="py-5 px-6">
                        <div className="w-44 space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">{officer.distinct_checkpoints} of {kpis.totalCheckpoints} Points</span>
                            <span className="text-blue-400">{officer.coverage_pct}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${officer.coverage_pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Coverage Rate % */}
                      <td className="py-5 px-6 text-center font-black text-base">
                        {officer.coverage_pct}%
                      </td>

                      {/* Current / Last Location */}
                      <td className="py-5 px-6">
                        {officer.last_scanned_location ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-xs truncate">{officer.last_scanned_location}</p>
                              <p className="text-[10px] text-slate-400">
                                {officer.last_scanned_at
                                  ? new Date(officer.last_scanned_at).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No scans in timeframe</span>
                        )}
                      </td>

                      {/* Patrol Status */}
                      <td className="py-5 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                            officer.total_scans > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {officer.total_scans > 0 ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              ON PATROL
                            </>
                          ) : (
                            'STANDBY'
                          )}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="py-5 px-6 text-center">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black ${
                            officer.total_scans >= 10
                              ? 'bg-[#D4FC04]/20 text-[#D4FC04] border border-[#D4FC04]/40'
                              : officer.total_scans > 0
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {officer.rating}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-base font-bold">
                    No officer patrol logs found for {timeframe}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: SUMMARY METRIC CHIPS & ACTIVITY CHARTS (Below Leaderboard)
          ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Compliance Score
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">{kpis.complianceScore}%</span>
            <span className="text-xs text-emerald-400 font-bold">Audit Grade A+</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" />
            Checkpoints Inspected
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">
              {kpis.checkpointsCoveredCount}
              <span className="text-slate-400 text-xl font-semibold"> / {kpis.totalCheckpoints}</span>
            </span>
            <span className="text-xs text-blue-400 font-bold">{kpis.coverageRate}%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-purple-400" />
            Verified Scans
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">{kpis.totalScans}</span>
            <span className="text-xs text-purple-400 font-bold">{kpis.successRate}% Success</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Pace Cadence
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">{kpis.avgPaceMinutes || 3.5}m</span>
            <span className="text-xs text-amber-400 font-bold">per checkpoint</span>
          </div>
        </div>
      </div>

      {/* Visual Chart & Checkpoint Inspection Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patrol Activity Trend AreaChart (7 cols) */}
        <div
          className={`lg:col-span-7 p-6 rounded-3xl border shadow-xl ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Patrol Scan Activity Rhythm
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {timeframe === 'today' ? 'Hourly patrol coverage cadence' : `Daily patrol distribution across ${timeframe}`}
              </p>
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">
              Live Trend
            </span>
          </div>

          <div className="h-60 w-full">
            {perfData?.trendData && perfData.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tvScanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4FC04" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4FC04" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isTvMode ? '#1e293b' : '#f1f5f9'} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#050D1A',
                      borderRadius: '12px',
                      color: '#fff',
                      border: '1px solid #1e293b',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scans"
                    stroke="#D4FC04"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#tvScanGrad)"
                    name="Scans"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No scan data in timeframe
              </div>
            )}
          </div>
        </div>

        {/* Checkpoint Inspection Heatmap (5 cols) */}
        <div
          className={`lg:col-span-5 p-6 rounded-3xl border shadow-xl flex flex-col justify-between ${
            isTvMode ? 'bg-[#0A1628] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Floor & Zone Health
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400">53 Checkpoints</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Inspection volume per building section</p>

            <div className="space-y-3">
              {perfData?.floorDistribution?.slice(0, 5).map((f: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate">{f.floor}</span>
                    <span className="text-emerald-400">{f.visits} scans · {f.coveragePct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#D4FC04] rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, f.coveragePct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Perimeter Checkpoints 100% Active</span>
            <span className="text-[#D4FC04] font-bold">MUVE QR v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
