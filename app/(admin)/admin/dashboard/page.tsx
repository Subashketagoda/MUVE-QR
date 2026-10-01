'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  QrCode,
  CalendarCheck,
  TrendingUp,
  Clock,
  Radio,
  PlusCircle,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  Check,
} from 'lucide-react'
import { TodoRow } from '@/types/database'
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

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
    fetchDashboardTodos()

    // 1. Instant cross-tab sync
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('muve_todos_bus')
        bc.onmessage = () => {
          fetchDashboardTodos()
        }
      }
    } catch (e) {}

    // 2. Continuous background polling every 2.5s
    const interval = setInterval(() => {
      fetchDashboardTodos()
    }, 2500)

    const onFocus = () => fetchDashboardTodos()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  const fetchDashboardTodos = async () => {
    try {
      const res = await fetch(`/api/todos?t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && Array.isArray(json.todos)) {
        setTodos(json.todos.slice(0, 5))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleQuickCheck = async (todo: TodoRow) => {
    const nextReviewed = !todo.admin_reviewed
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, admin_reviewed: nextReviewed } : t))
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
        body: JSON.stringify({
          id: todo.id,
          admin_reviewed: nextReviewed,
          reviewed_by: nextReviewed ? 'System Admin' : null,
        }),
      })
      toast.success(nextReviewed ? `Verified "${todo.title}"` : `Unchecked "${todo.title}"`)
    } catch (e) {
      toast.error('Failed to update')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics')
      const json = await res.json()
      if (json.success) {
        setData(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 skeleton rounded-xl" />
          <div className="h-72 skeleton rounded-xl" />
        </div>
      </div>
    )
  }

  const stats = data?.stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalQRCodes: 0,
    scansToday: 0,
    scansThisWeek: 0,
    scansThisMonth: 0,
  }

  const charts = data?.charts || {
    scansPerDay: [],
    scansByQR: [],
    scansByUser: [],
    hourlyActivity: [],
  }

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">
            Real-time activity metrics and location scanning analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/live-scans" className="btn btn-secondary btn-sm">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            Live Scans
          </Link>
          <Link href="/admin/qr-codes" className="btn btn-primary btn-sm">
            <PlusCircle className="w-4 h-4" />
            Create QR
          </Link>
        </div>
      </div>

      {/* 6 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeUsers}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">QR Codes</span>
            <QrCode className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalQRCodes}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scans Today</span>
            <CalendarCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.scansToday}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">This Week</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.scansThisWeek}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.scansThisMonth}</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Scans Per Day */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">1. Scans Per Day</h3>
          <p className="text-xs text-slate-500 mb-4">Daily scan volume for the past 7 days</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.scansPerDay}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorScans)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Scans by QR Code */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">2. Scans by QR Code</h3>
          <p className="text-xs text-slate-500 mb-4">Total scans recorded per QR location</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.scansByQR}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="qr" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="scans" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Scans by User */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">3. Scans by User</h3>
          <p className="text-xs text-slate-500 mb-4">Activity distribution across registered users</p>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.scansByUser}
                  dataKey="scans"
                  nameKey="user"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={5}
                  label={({ name, percent }: any) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {charts.scansByUser.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Hourly Scan Activity */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">4. Hourly Scan Activity</h3>
          <p className="text-xs text-slate-500 mb-4">Scan frequency across 24 hours of the day</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={3} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="scans" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Checklist & Tasks Review Section on Dashboard */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">User Inspection Tasks & Checklist</h3>
                <span className="text-[10px] font-extrabold bg-[#D4FC04] text-black px-2 py-0.5 rounded-full">
                  Admin Verification
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tasks logged by mobile users awaiting admin check and sign-off
              </p>
            </div>
          </div>

          <Link
            href="/admin/todos"
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <span>View All Tasks</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {todos.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center">
            <p className="text-sm text-slate-500 font-medium">No tasks logged by users yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todos.map((todo) => {
              const isDone = todo.status === 'completed'
              const isReviewed = todo.admin_reviewed

              return (
                <div
                  key={todo.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {todo.user_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{todo.title}</span>
                        <span className="text-xs text-slate-400">• {todo.user_name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            todo.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : todo.priority === 'high'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {todo.priority}
                        </span>
                      </div>
                      {todo.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {todo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      User: {isDone ? 'Done' : 'Pending'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleQuickCheck(todo)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        isReviewed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isReviewed ? '✓ Verified' : 'Check & Verify'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
