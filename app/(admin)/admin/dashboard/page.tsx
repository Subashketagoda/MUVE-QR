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
} from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

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
    </div>
  )
}
