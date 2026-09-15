'use client'

import React, { useEffect, useState } from 'react'
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
} from 'lucide-react'

export default function UserHomePage() {
  const [user, setUser] = useState<any>(null)
  const [scansToday, setScansToday] = useState(0)
  const [lastScan, setLastScan] = useState<any>(null)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read logged in user from localStorage
    const saved = localStorage.getItem('muve_user')
    let currentUsr = { id: 'usr_user_001', full_name: 'User 01', phone: '077 111 1111', role: 'user' }
    if (saved) {
      try {
        currentUsr = JSON.parse(saved)
      } catch (e) {}
    }
    setUser(currentUsr)
    fetchUserScans(currentUsr.id)
  }, [])

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
      const res = await fetch(`/api/scans?userId=${userId}&limit=20`)
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

  return (
    <div className="space-y-5 pb-6">
      {/* Premium Hero Header */}
      <div className="bg-gradient-to-b from-[#051824] via-[#072B3B] to-[#0a384d] text-white p-6 pt-7 rounded-b-[32px] shadow-xl relative overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4FC04]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Bar with Logo and Status */}
          <div className="flex items-center justify-between">
            <Logo size="sm" showSubtitle={true} subtitleText="COLOMBO" variant="dark" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Ready</span>
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
        {/* Primary Giant SCAN QR CODE Hero Card */}
        <Link
          href="/app/scan"
          className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] transition-transform duration-200 block group"
        >
          {/* Subtle patterned overlay */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-blue-700 flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#D4FC04] text-black px-1.5 py-0.5 rounded">
                    Action
                  </span>
                  <span className="text-xs font-semibold text-blue-200">Point Scanner</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                  SCAN CHECKPOINT
                </h3>
                <p className="text-xs text-blue-100/90">Instant QR camera & location logger</p>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
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
    </div>
  )
}
