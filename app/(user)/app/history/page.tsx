'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  History as HistoryIcon,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Filter,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  ChevronRight,
  Search,
} from 'lucide-react'

export default function UserHistoryPage() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'today'>('all')

  useEffect(() => {
    fetchHistory()
  }, [selectedDate, activeTab])

  const fetchHistory = async () => {
    setLoading(true)
    const saved = localStorage.getItem('muve_user')
    let userId = '00000000-0000-0000-0000-000000000002'
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        userId = (parsed.id === 'usr_user_001' || !parsed.id) ? '00000000-0000-0000-0000-000000000002' : parsed.id
      } catch (e) {}
    }

    let localList: any[] = []
    try {
      localList = JSON.parse(localStorage.getItem('muve_local_scans') || '[]')
    } catch (e) {}

    try {
      const res = await fetch(`/api/scans?userId=${userId}&limit=100`)
      const json = await res.json()
      let combined = localList
      if (json.success && json.scans) {
        const map = new Map()
        localList.forEach((s: any) => map.set(s.id, s))
        json.scans.forEach((s: any) => map.set(s.id, s))
        combined = Array.from(map.values()).sort(
          (a: any, b: any) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
        )
      }

      if (activeTab === 'today') {
        const todayStr = new Date().toISOString().split('T')[0]
        combined = combined.filter((s: any) => (s.scanned_at || '').startsWith(todayStr))
      } else if (selectedDate) {
        combined = combined.filter((s: any) => (s.scanned_at || '').startsWith(selectedDate))
      }

      setScans(combined)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="p-4 space-y-4"
      style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.5rem), 2.75rem)' }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/app/home"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Scan History</h1>
            <p className="text-[11px] text-slate-500 font-medium">Activity audit log & timestamps</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
          {scans.length} {scans.length === 1 ? 'Scan' : 'Scans'}
        </span>
      </div>

      {/* Filter Tabs & Date Input */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-2xl">
          <button
            onClick={() => {
              setActiveTab('all')
              setSelectedDate('')
            }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'all' && !selectedDate
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => {
              setActiveTab('today')
              setSelectedDate('')
            }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today&apos;s Scans
          </button>
        </div>

        {/* Date Selector */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setActiveTab('all')
              }}
              className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none w-full cursor-pointer"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-blue-600 font-bold hover:underline px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scan History Feed */}
      {loading ? (
        <div className="space-y-2.5 pt-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl text-center text-slate-400 space-y-3 border border-slate-100 shadow-xs mt-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
            <HistoryIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No Scans Found</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDate ? 'No scans recorded on this date.' : 'Your recorded checkpoint logs will appear here.'}
            </p>
          </div>
          <Link
            href="/app/scan"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Checkpoint Now</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {scans.map((s, idx) => (
            <div
              key={s.id || idx}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:border-slate-200 transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                    {s.qr_name || 'Checkpoint'}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{s.location_name || 'Designated Area'}</span>
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100/80 text-emerald-800">
                  Verified
                </span>
                <p className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                  {new Date(s.scanned_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(s.scanned_at).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
