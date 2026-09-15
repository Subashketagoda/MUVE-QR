'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { QrCode, MapPin, Clock, Calendar, ChevronRight, ShieldCheck, Smartphone, Download } from 'lucide-react'

export default function UserHomePage() {
  const [user, setUser] = useState<any>(null)
  const [scansToday, setScansToday] = useState(0)
  const [lastScan, setLastScan] = useState<any>(null)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read logged in user from localStorage
    const saved = localStorage.getItem('muve_user')
    let currentUsr = { id: 'usr_user_001', full_name: 'User 01', email: 'user01@muveqr.app' }
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
    <div className="p-4 space-y-6">
      {/* Top Header Branding */}
      <div className="bg-[#072B3B] -mx-4 -mt-4 p-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <Logo size="sm" showSubtitle={true} subtitleText="COLOMBO" />
          <span className="badge badge-success text-[10px]">Online</span>
        </div>

        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Welcome Back</p>
          <h2 className="text-2xl font-bold text-white mt-0.5">{user?.full_name || 'User 01'}</h2>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {user?.phone || '077 111 1111'}
          </p>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Scans */}
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Scans</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{loading ? '...' : scansToday}</p>
        </div>

        {/* Last Scan */}
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Last Scan</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          {lastScan ? (
            <div>
              <p className="font-bold text-sm text-slate-900 truncate">
                {lastScan.qr_name} – {lastScan.location_name}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {new Date(lastScan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No scans today</p>
          )}
        </div>
      </div>

      {/* Large SCAN QR CODE Call-to-action */}
      <Link
        href="/app/scan"
        className="card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-between shadow-xl active:scale-[0.98] transition block group"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <QrCode className="w-8 h-8 group-hover:scale-110 transition" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">SCAN QR CODE</h3>
            <p className="text-xs text-blue-100">Tap to open mobile camera scanner</p>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition" />
      </Link>

      {/* Android APK Download Card */}
      <Link
        href="/download"
        className="card p-4 bg-navy-950 text-white border border-white/10 rounded-2xl flex items-center justify-between shadow-md hover:border-[#D4FC04]/50 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4FC04]/10 border border-[#D4FC04]/20 flex items-center justify-center text-[#D4FC04]">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              Download Android APK
              <span className="text-[10px] bg-[#D4FC04] text-black font-extrabold px-1.5 py-0.5 rounded">NEW</span>
            </h4>
            <p className="text-xs text-slate-400">Install native APK or add to home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-[#D4FC04] group-hover:translate-x-0.5 transition-transform">
          <Download className="w-4 h-4" />
        </div>
      </Link>

      {/* Recent Scans Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Successful Scans</h3>
          <Link href="/app/history" className="text-xs text-blue-600 font-semibold hover:underline">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-xl" />
            ))}
          </div>
        ) : recentScans.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-xs">
            <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No scan history yet. Tap the button above to scan your first QR code!
          </div>
        ) : (
          <div className="space-y-2">
            {recentScans.map((s) => (
              <div key={s.id} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">
                      {s.qr_name} • {s.location_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(s.scanned_at).toLocaleDateString('en-GB')} at{' '}
                      {new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="badge badge-success text-[10px]">Success</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
