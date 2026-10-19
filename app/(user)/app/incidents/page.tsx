'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  AlertTriangle,
  Flame,
  Droplet,
  Zap,
  Lock,
  HeartPulse,
  Wrench,
  HelpCircle,
  MapPin,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidentCategory, IncidentSeverity, IncidentRow } from '@/types/database'

const CATEGORIES: { id: IncidentCategory; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: 'security', label: 'Security / Trespass', icon: Lock, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'fire_safety', label: 'Fire / Smoke', icon: Flame, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'maintenance', label: 'Water Leak / Pipe', icon: Droplet, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { id: 'damage', label: 'Electrical Fault', icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'medical', label: 'Medical Emergency', icon: HeartPulse, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'damage', label: 'Damage / Vandalism', icon: Wrench, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { id: 'other', label: 'Other Hazard', icon: HelpCircle, color: 'text-slate-600 bg-slate-50 border-slate-200' },
]

const SEVERITIES: { id: IncidentSeverity; label: string; desc: string; color: string; border: string }[] = [
  { id: 'low', label: 'Low', desc: 'Routine note / minor fix', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-300' },
  { id: 'medium', label: 'Medium', desc: 'Needs attention this shift', color: 'bg-blue-50 text-blue-700', border: 'border-blue-300' },
  { id: 'high', label: 'High', desc: 'Urgent response required', color: 'bg-amber-50 text-amber-700', border: 'border-amber-300' },
  { id: 'critical', label: 'Critical', desc: 'Immediate danger / Siren alert', color: 'bg-rose-600 text-white animate-pulse', border: 'border-rose-600' },
]

export default function GuardIncidentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [user, setUser] = useState<any>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<IncidentCategory>('security')
  const [severity, setSeverity] = useState<IncidentSeverity>('high')
  const [locationName, setLocationName] = useState('')
  const [description, setDescription] = useState('')
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // History State
  const [history, setHistory] = useState<IncidentRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Read logged in user
    const saved = localStorage.getItem('muve_user')
    let currentUsr = { id: '00000000-0000-0000-0000-000000000002', full_name: 'User 01', phone: '077 111 1111' }
    if (saved) {
      try {
        currentUsr = JSON.parse(saved)
      } catch (e) {}
    }
    setUser(currentUsr)

    // Auto-fetch GPS on load
    fetchGpsLocation()

    // Fetch history
    fetchIncidentHistory(currentUsr.id)
  }, [])

  const fetchGpsLocation = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        })
        setGpsLoading(false)
      },
      (err) => {
        console.warn('GPS error:', err.message)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const fetchIncidentHistory = async (userId: string) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/incidents?t=${Date.now()}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.incidents)) {
        setHistory(data.incidents)
      }
    } catch (e) {
      console.warn('Error loading incidents:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Handle Photo selection & compression
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 900
        const MAX_HEIGHT = 900
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressed = canvas.toDataURL('image/jpeg', 0.75)
        setPhotoData(compressed)
        toast.success('Photo attached successfully')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a brief title for the incident.')
      return
    }
    if (!locationName.trim()) {
      toast.error('Please enter the location of this incident.')
      return
    }
    if (!description.trim()) {
      toast.error('Please provide a description of the hazard.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        category,
        severity,
        location_name: locationName.trim(),
        description: description.trim(),
        photo_url: photoData,
        reported_by_id: user?.id || 'usr_anonymous',
        reported_by_name: user?.full_name || 'Staff Officer',
        reported_by_phone: user?.phone || null,
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
      }

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        if ('vibrate' in navigator) {
          navigator.vibrate([150, 80, 150])
        }
        toast.success('🚨 Incident Report Broadcasted to Admins!')
        setTitle('')
        setDescription('')
        setLocationName('')
        setPhotoData(null)
        setActiveTab('history')
        fetchIncidentHistory(user?.id)
      } else {
        toast.error(data.error || 'Failed to submit incident')
      }
    } catch (err: any) {
      toast.error(err.message || 'Submission error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/home"
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Emergency & Hazards
            </span>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Report Incident</h1>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Report
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history')
              fetchIncidentHistory(user?.id)
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Log ({history.length})
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Severity Selector */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              1. Severity Level <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map((s) => {
                const isSelected = severity === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id)}
                    className={`p-2.5 rounded-2xl text-left border-2 transition transform active:scale-95 ${
                      isSelected
                        ? `${s.border} ${s.color} ring-2 ring-offset-1`
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black text-xs">
                      <span>{s.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{s.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Incident Category */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              2. Hazard Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id + cat.label}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-2xl flex items-center gap-2 border text-xs font-bold transition text-left active:scale-95 ${
                      isSelected
                        ? `${cat.color} border-current ring-1 ring-current shadow-sm`
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details & Location */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                3. Incident Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master padlock severed, Water leak"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Location / Checkpoint <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={fetchGpsLocation}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  {gpsLoading ? 'Locating...' : gpsCoords ? 'GPS Attached' : 'Auto GPS'}
                </button>
              </div>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Warehouse Rear Gate, 2nd Floor Lobby"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                Description & Immediate Actions <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed, what danger exists, and what temporary action you took..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          </div>

          {/* Photo Attachment (Direct Mobile Camera) */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                4. Photo Evidence (Optional)
              </label>
              <span className="text-[10px] font-bold text-slate-400">Mobile Camera</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {photoData ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 group">
                <img src={photoData} alt="Incident Evidence" className="w-full h-44 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 hover:bg-black text-white transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Photo Attached
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500 transition active:scale-98"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800">Tap to Take Live Photo</p>
                  <p className="text-[10px] text-slate-400">Rear camera launches automatically</p>
                </div>
              </button>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide uppercase transition shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
              severity === 'critical'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Broadcasting Report...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Incident Report
              </>
            )}
          </button>
        </form>
      ) : (
        /* History Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Recent Incident Log</span>
            <button
              onClick={() => fetchIncidentHistory(user?.id)}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700">No Incidents Reported</p>
              <p className="text-xs text-slate-400 mt-1">All patrols report normal status.</p>
            </div>
          ) : (
            history.map((item) => {
              const statusColors: Record<string, string> = {
                reported: 'bg-amber-100 text-amber-800 border-amber-300',
                investigating: 'bg-blue-100 text-blue-800 border-blue-300',
                resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                dismissed: 'bg-slate-100 text-slate-600 border-slate-300',
              }

              const severityColors: Record<string, string> = {
                low: 'bg-emerald-50 text-emerald-700',
                medium: 'bg-blue-50 text-blue-700',
                high: 'bg-amber-50 text-amber-700',
                critical: 'bg-rose-50 text-rose-700 font-black',
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${statusColors[item.status]}`}>
                          {item.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${severityColors[item.severity]}`}>
                          {item.severity}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1">{item.title}</h4>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.location_name}
                    </span>
                    <span>By: {item.reported_by_name}</span>
                  </div>

                  {item.action_taken && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5">
                        Manager Action Note:
                      </span>
                      <p className="text-slate-600">{item.action_taken}</p>
                    </div>
                  )}

                  {item.photo_url && (
                    <div className="pt-1">
                      <img
                        src={item.photo_url}
                        alt="Evidence"
                        className="w-full h-32 rounded-xl object-cover border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
