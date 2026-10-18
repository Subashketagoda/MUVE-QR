'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp,
  Activity,
  Award,
  Zap,
  Calendar,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Users,
  MapPin,
  Trophy,
  Flame,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']

export default function AdminPerformancePage() {
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('7d')
  const [selectedOfficer, setSelectedOfficer] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'officers' | 'checkpoints'>('officers')
  const [checkpointSearch, setCheckpointSearch] = useState('')
  const [checkpointFilter, setCheckpointFilter] = useState<'all' | 'visited' | 'unvisited'>('all')

  const [perfData, setPerfData] = useState<any>(null)

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('timeframe', timeframe)
      if (selectedOfficer) params.set('userId', selectedOfficer)

      const res = await fetch(`/api/performance?${params.toString()}&t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.success) {
        setPerfData(data)
      } else {
        toast.error('Failed to load performance data: ' + data.message)
      }
    } catch (err: any) {
      toast.error('Network error loading performance analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformance()
  }, [timeframe, selectedOfficer])

  // Filtered checkpoints for tab 2
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

  // Export Performance Data to CSV
  const exportPerformanceCSV = () => {
    if (!perfData) return
    const rows = [
      ['MUVE QR Performance Report', `Timeframe: ${timeframe}`, `Generated: ${new Date().toLocaleString()}`],
      [],
      ['KPI Summary'],
      ['Compliance Score', `${perfData.kpis.complianceScore}%`],
      ['Checkpoints Covered', `${perfData.kpis.checkpointsCoveredCount} of ${perfData.kpis.totalCheckpoints}`],
      ['Coverage Rate', `${perfData.kpis.coverageRate}%`],
      ['Total Scans', perfData.kpis.totalScans],
      ['Success Rate', `${perfData.kpis.successRate}%`],
      ['Avg Inspection Pace', `${perfData.kpis.avgPaceMinutes} minutes`],
      [],
      ['Officer Leaderboard'],
      ['Rank', 'Name', 'Email', 'Phone', 'Total Scans', 'Checkpoints Covered', 'Coverage %', 'Avg Pace (mins)', 'Score', 'Rating'],
      ...perfData.officerLeaderboard.map((o: any, idx: number) => [
        `#${idx + 1}`,
        o.full_name,
        o.email,
        o.phone,
        o.total_scans,
        o.distinct_checkpoints,
        `${o.coverage_pct}%`,
        o.avg_pace_minutes || 'N/A',
        o.score,
        o.rating,
      ]),
      [],
      ['Checkpoint Status'],
      ['Name', 'Visits in Period', 'Status', 'Last Scanned At', 'Token'],
      ...perfData.checkpointStats.map((c: any) => [
        c.location_name,
        c.visits,
        c.status,
        c.last_scanned_at ? new Date(c.last_scanned_at).toLocaleString() : 'Never',
        c.token,
      ]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `muve_performance_${timeframe}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Performance report exported as CSV!')
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/60 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Patrol Intelligence
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-[#D4FC04]" />
            Operations & Guard Performance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time officer compliance, checkpoint coverage, inspection velocity & quality audit
          </p>
        </div>

        {/* Timeframe & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Pills */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeframe === t.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Officer Dropdown Filter */}
          <select
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
            className="bg-slate-950/90 text-xs font-medium text-slate-200 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="">All Officers</option>
            {perfData?.officerLeaderboard?.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.full_name}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchPerformance}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* CSV Export Button */}
          <button
            onClick={exportPerformanceCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4FC04] text-slate-950 hover:bg-[#c2e803] font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Compliance Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Patrol Compliance
            </span>
            <span
              className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md ${
                kpis.complianceScore >= 80
                  ? 'bg-emerald-100 text-emerald-800'
                  : kpis.complianceScore >= 50
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {kpis.complianceScore >= 85 ? 'Grade A+ (Optimal)' : kpis.complianceScore >= 60 ? 'Grade B' : 'Needs Focus'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{kpis.complianceScore}%</span>
            <span className="text-xs text-slate-500 font-medium">overall audit score</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                kpis.complianceScore >= 80 ? 'bg-emerald-500' : kpis.complianceScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${kpis.complianceScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Weighted across total coverage and checkpoint scan validity
          </p>
        </div>

        {/* KPI 2: Checkpoint Coverage */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Checkpoint Coverage
            </span>
            <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-blue-100 text-blue-800">
              {kpis.coverageRate}% Reach
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {kpis.checkpointsCoveredCount}
              <span className="text-slate-400 font-semibold text-xl"> / {kpis.totalCheckpoints}</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${kpis.coverageRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {kpis.totalCheckpoints - kpis.checkpointsCoveredCount > 0
              ? `${kpis.totalCheckpoints - kpis.checkpointsCoveredCount} checkpoints remain uninspected`
              : '100% full building perimeter covered!'}
          </p>
        </div>

        {/* KPI 3: Total Patrol Scans */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-purple-600" />
              Patrol Scans Logged
            </span>
            <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-purple-100 text-purple-800">
              {kpis.successRate}% Success
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{kpis.totalScans}</span>
            <span className="text-xs text-slate-500 font-medium">scans verified</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${kpis.successRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {kpis.successfulScans} successful · {kpis.rejectedScans} rejected/cooldown
          </p>
        </div>

        {/* KPI 4: Average Patrol Pace */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Inspection Pace
            </span>
            <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-amber-100 text-amber-800">
              Cadence
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {kpis.avgPaceMinutes > 0 ? `${kpis.avgPaceMinutes}m` : '3.5m'}
            </span>
            <span className="text-xs text-slate-500 font-medium">per checkpoint</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-3/4" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Standard floor transit speed between checkpoints
          </p>
        </div>
      </div>

      {/* 3. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Activity Timeline Trend (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Patrol Scan Volume & Activity Trend
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {timeframe === 'today' ? 'Hourly patrol frequency throughout the day' : `Daily patrol distribution across ${timeframe}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Total Scans
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Verified Valid
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {perfData?.trendData && perfData.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="succGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="scans" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#scanGrad)" name="Total Scans" />
                  <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#succGrad)" name="Successful" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No scan activity recorded in this timeframe
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Floor-wise Coverage (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Floor & Zone Inspection
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Inspection volume per building section</p>

            <div className="space-y-3.5">
              {perfData?.floorDistribution && perfData.floorDistribution.length > 0 ? (
                perfData.floorDistribution.slice(0, 5).map((f: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate">{f.floor}</span>
                      <span className="text-slate-500">
                        {f.visits} scans · <strong className="text-indigo-600">{f.coveragePct}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, f.coveragePct))}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Floor data will populate as patrol checkpoints are scanned
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>53 Checkpoints configured</span>
            <span className="font-bold text-slate-700">All floors monitored</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation: Officers Leaderboard vs Checkpoints Audit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('officers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'officers'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#D4FC04]" />
              Officer Performance Leaderboard ({perfData?.officerLeaderboard?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'checkpoints'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-blue-500" />
              Checkpoint Inspection Heatmap ({perfData?.checkpointStats?.length || 53})
            </button>
          </div>

          {/* Tab 2 filters if active */}
          {activeTab === 'checkpoints' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter checkpoint name..."
                  value={checkpointSearch}
                  onChange={(e) => setCheckpointSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 w-44"
                />
              </div>

              <select
                value={checkpointFilter}
                onChange={(e) => setCheckpointFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                <option value="all">All Points</option>
                <option value="visited">Visited Only</option>
                <option value="unvisited">Missed / Unvisited</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1 Content: Officer Leaderboard */}
        {activeTab === 'officers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-6">Officer / Personnel</th>
                  <th className="py-3 px-6 text-center">Total Scans</th>
                  <th className="py-3 px-6">Checkpoints Covered</th>
                  <th className="py-3 px-6 text-center">Coverage %</th>
                  <th className="py-3 px-6 text-center">Avg Pace</th>
                  <th className="py-3 px-6 text-center">Performance Rating</th>
                  <th className="py-3 px-6">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {perfData?.officerLeaderboard && perfData.officerLeaderboard.length > 0 ? (
                  perfData.officerLeaderboard.map((officer: any, index: number) => {
                    const isTop1 = index === 0 && officer.total_scans > 0
                    const isTop2 = index === 1 && officer.total_scans > 0
                    const isTop3 = index === 2 && officer.total_scans > 0

                    return (
                      <tr key={officer.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Rank Badge */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                              isTop1
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                                : isTop2
                                ? 'bg-slate-300 text-slate-800'
                                : isTop3
                                ? 'bg-amber-600/30 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        {/* Officer Profile */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-[#D4FC04] font-bold flex items-center justify-center text-xs">
                              {officer.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{officer.full_name}</p>
                              <p className="text-[11px] text-slate-400">{officer.phone !== 'N/A' ? officer.phone : officer.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Total Scans */}
                        <td className="py-4 px-6 text-center font-black text-slate-900 text-sm">
                          {officer.total_scans}
                        </td>

                        {/* Checkpoints Covered */}
                        <td className="py-4 px-6">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                              <span>{officer.distinct_checkpoints} of {kpis.totalCheckpoints}</span>
                              <span>{officer.coverage_pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${officer.coverage_pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Coverage % */}
                        <td className="py-4 px-6 text-center font-bold text-slate-800">
                          {officer.coverage_pct}%
                        </td>

                        {/* Avg Pace */}
                        <td className="py-4 px-6 text-center text-slate-600 font-medium">
                          {officer.avg_pace_minutes ? `${officer.avg_pace_minutes} mins` : '—'}
                        </td>

                        {/* Performance Rating */}
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              officer.total_scans >= 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : officer.total_scans > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {officer.total_scans >= 10 ? '✓ Outstanding' : officer.total_scans > 0 ? 'Good' : 'Standby'}
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="py-4 px-6 text-slate-500 text-[11px]">
                          {officer.last_scanned_at ? (
                            new Date(officer.last_scanned_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-400">No activity</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No officer records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2 Content: Checkpoint Inspection Heatmap */}
        {activeTab === 'checkpoints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">#</th>
                  <th className="py-3 px-6">Checkpoint Location Name</th>
                  <th className="py-3 px-6 text-center">Visits in Period</th>
                  <th className="py-3 px-6 text-center">Inspection Health</th>
                  <th className="py-3 px-6">Last Inspected</th>
                  <th className="py-3 px-6">Security Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCheckpoints.length > 0 ? (
                  filteredCheckpoints.map((cp: any, index: number) => {
                    return (
                      <tr key={cp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span>{cp.location_name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-center font-black text-slate-800">
                          {cp.visits}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cp.visits >= 3
                                ? 'bg-emerald-100 text-emerald-800'
                                : cp.visits > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cp.visits >= 3 ? '✓ Optimal Frequency' : cp.visits > 0 ? 'Moderate' : '⚠ Uninspected'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 text-[11px]">
                          {cp.last_scanned_at ? (
                            new Date(cp.last_scanned_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-rose-500 font-semibold">Never in this range</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                          {cp.token}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No checkpoints matching current search filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
