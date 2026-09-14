'use client'

import React, { useEffect, useState } from 'react'
import { Radio, Volume2, VolumeX, ShieldCheck, MapPin, Clock, User, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ScanLogEnriched } from '@/types/database'
import { toast } from 'sonner'

export default function LiveScansPage() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    fetchScans()

    // Setup Supabase Realtime listener
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let channel: any = null

    if (isSupabaseConfigured) {
      channel = supabase
        .channel('live-scans-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'scan_logs' },
          (payload) => {
            const newScan = payload.new
            handleNewLiveScan(newScan)
          }
        )
        .subscribe()
    } else {
      // Polling fallback in demo mode to pick up new scans
      const interval = setInterval(fetchScans, 3000)
      return () => clearInterval(interval)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [soundEnabled])

  const fetchScans = async () => {
    try {
      const res = await fetch('/api/scans?limit=50')
      const json = await res.json()
      if (json.success) {
        setScans(json.scans)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const playNotificationSound = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch (e) {
      // AudioContext might be restricted until user interacts
    }
  }

  const handleNewLiveScan = (newScan: any) => {
    playNotificationSound()
    toast.success(`Live Scan: ${newScan.user_name || 'User'} scanned ${newScan.qr_name}`)

    setScans((prev) => {
      // Avoid duplicate keys
      if (prev.some((s) => s.id === newScan.id)) return prev
      return [newScan, ...prev]
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Live Scans</h1>
            <div className="live-indicator">
              <span className="live-dot" />
              <span>LIVE</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            Real-time WebSocket stream of user scanning events as they happen
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`btn btn-sm ${soundEnabled ? 'btn-secondary' : 'btn-ghost'}`}
            title="Toggle notification sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>
        </div>
      </div>

      {/* Main Realtime Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 skeleton rounded-lg" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
            <p className="font-semibold text-slate-700">Waiting for live scans...</p>
            <p className="text-xs text-slate-400 mt-1">
              Scans submitted by users on their mobile app will stream here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>QR Code</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scans.map((scan, idx) => (
                  <tr
                    key={scan.id}
                    className={idx === 0 ? 'bg-blue-50/40 new-scan-row' : ''}
                  >
                    {/* User */}
                    <td className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {(scan.user_name || 'User')[0]}
                        </div>
                        <div>
                          <p>{scan.user_name || 'User 01'}</p>
                          {scan.user_email && (
                            <p className="text-[11px] text-slate-400 font-normal">
                              {scan.user_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* QR Code */}
                    <td>
                      <span className="badge badge-navy">
                        <QrCode className="w-3 h-3" />
                        {scan.qr_name}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{scan.location_name}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="text-slate-600">
                      {new Date(scan.scanned_at).toLocaleDateString('en-GB')}
                    </td>

                    {/* Time */}
                    <td className="font-mono text-slate-900 font-semibold">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(scan.scanned_at).toLocaleTimeString('en-US', {
                          hour12: false,
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {scan.status === 'success' ? (
                        <span className="badge badge-success">
                          <ShieldCheck className="w-3 h-3" />
                          Success
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          {scan.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
