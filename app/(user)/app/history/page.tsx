'use client'

import React, { useEffect, useState } from 'react'
import { History as HistoryIcon, Calendar, MapPin, Clock, ShieldCheck, Filter } from 'lucide-react'

export default function UserHistoryPage() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [selectedDate])

  const fetchHistory = async () => {
    setLoading(true)
    const saved = localStorage.getItem('muve_user')
    let userId = 'usr_user_001'
    if (saved) {
      try {
        userId = JSON.parse(saved).id
      } catch (e) {}
    }

    let localList: any[] = []
    try {
      localList = JSON.parse(localStorage.getItem('muve_local_scans') || '[]')
      if (localList.length > 0) {
        let list = localList
        if (selectedDate) {
          list = list.filter((s: any) => s.scanned_at.split('T')[0] === selectedDate)
        }
        setScans(list)
      }
    } catch (e) {}

    try {
      const res = await fetch(`/api/scans?userId=${userId}&limit=100`)
      const json = await res.json()
      if (json.success && json.scans) {
        const serverList = json.scans
        const map = new Map()
        localList.forEach((s: any) => map.set(s.id, s))
        serverList.forEach((s: any) => map.set(s.id, s))
        let combined = Array.from(map.values()).sort(
          (a: any, b: any) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
        )

        if (selectedDate) {
          combined = combined.filter(
            (s: any) => s.scanned_at.split('T')[0] === selectedDate
          )
        }
        setScans(combined)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Scan History</h1>
        <p className="text-xs text-slate-500">Your personal record of successful QR scans</p>
      </div>

      {/* Date Filter Bar */}
      <div className="card p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input text-xs py-1"
          />
        </div>
        {selectedDate && (
          <button
            onClick={() => setSelectedDate('')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 space-y-2">
          <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700 text-sm">No scan history found</p>
          <p className="text-xs">Scans you submit will appear here chronologically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <div key={s.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="badge badge-navy text-[10px]">{s.qr_name}</span>
                <span className="badge badge-success text-[10px]">{s.status}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="font-bold text-slate-900 text-sm">{s.location_name}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                <span>{new Date(s.scanned_at).toLocaleDateString('en-GB')}</span>
                <span className="font-bold text-slate-800">
                  {new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
