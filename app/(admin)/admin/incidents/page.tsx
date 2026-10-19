'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Droplet,
  Zap,
  Lock,
  HeartPulse,
  Wrench,
  HelpCircle,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  Filter,
  Search,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  FileDown,
  X,
  Check,
  Phone,
  Siren,
} from 'lucide-react'
import { toast } from 'sonner'
import { soundEngine } from '@/lib/sounds'
import { IncidentRow, IncidentStatus, IncidentSeverity } from '@/types/database'

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Resolution Modal State
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null)
  const [resolutionAction, setResolutionAction] = useState('')
  const [resolutionStatus, setResolutionStatus] = useState<IncidentStatus>('resolved')
  const [updating, setUpdating] = useState(false)

  // Lightbox Photo Modal State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const latestIncidentIdRef = useRef<string | null>(null)

  // Web Audio API Emergency Siren/Beep for critical incidents
  // Tactical Police/Ambulance SOS Siren for emergency alerts
  const playSirenAlert = useCallback(() => {
    if (!soundEnabled) return
    const siren = soundEngine.startSOSSiren()
    setTimeout(() => {
      siren.stop()
    }, 4500)
  }, [soundEnabled])

  const fetchIncidents = async (isInitial = false) => {
    try {
      const res = await fetch(`/api/incidents?t=${Date.now()}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.incidents)) {
        if (!isInitial && latestIncidentIdRef.current && data.incidents.length > 0) {
          const newest = data.incidents[0]
          if (newest.id !== latestIncidentIdRef.current) {
            playSirenAlert()
            toast.error(`🚨 NEW INCIDENT: ${newest.title} at ${newest.location_name}!`, {
              duration: 6000,
            })
          }
        }

        if (data.incidents.length > 0) {
          latestIncidentIdRef.current = data.incidents[0].id
        }
        setIncidents(data.incidents)
      }
    } catch (e) {
      console.warn('Failed to load incidents:', e)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents(true)
    const interval = setInterval(() => {
      fetchIncidents(false)
    }, 4000)

    return () => clearInterval(interval)
  }, [soundEnabled])

  const handleUpdateStatus = async () => {
    if (!selectedIncident) return
    setUpdating(true)
    try {
      const res = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedIncident.id,
          status: resolutionStatus,
          action_taken: resolutionAction.trim() || selectedIncident.action_taken,
          resolved_by: 'Control Room Admin',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Incident status updated to ${resolutionStatus.toUpperCase()}`)
        setSelectedIncident(null)
        setResolutionAction('')
        fetchIncidents(false)
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  const exportCSV = () => {
    if (incidents.length === 0) {
      toast.error('No incidents to export')
      return
    }

    const headers = ['ID', 'Title', 'Category', 'Severity', 'Location', 'Status', 'Reported By', 'Date', 'Action Taken']
    const rows = incidents.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      `"${i.location_name.replace(/"/g, '""')}"`,
      i.status,
      `"${i.reported_by_name}"`,
      new Date(i.created_at).toLocaleString(),
      `"${(i.action_taken || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `muve-qr-incidents-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Incidents exported to CSV')
  }

  // Filtered List
  const filteredIncidents = incidents.filter((i) => {
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter
    const matchesSearch =
      searchQuery === '' ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.reported_by_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSeverity && matchesSearch
  })

  // KPI Calculations
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length
  const pendingCount = incidents.filter((i) => i.status === 'reported' || i.status === 'investigating').length
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'security':
        return Lock
      case 'fire_safety':
        return Flame
      case 'maintenance':
        return Droplet
      case 'damage':
        return Wrench
      case 'medical':
        return HeartPulse
      default:
        return AlertTriangle
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-rose-400">
              Live Facility Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Incident & Hazard Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time hazard reports, guard photo evidence, and emergency response dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Siren Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              soundEnabled
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Siren Alert: ON' : 'Siren Muted'}</span>
          </button>

          {/* Test SOS Siren Button */}
          <button
            onClick={() => {
              if (soundEngine.isPlaying()) {
                soundEngine.stopSOSSiren()
                toast.info('Siren stopped')
              } else {
                const siren = soundEngine.startSOSSiren()
                toast.error('🚨 Playing Supiri Tactical SOS Siren...', { duration: 4500 })
                setTimeout(() => siren.stop(), 4500)
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Siren className="w-4 h-4 animate-bounce" />
            <span>Test SOS Siren</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Total Reports</span>
            <ShieldAlert className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{incidents.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Logged across all patrol sites</p>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold uppercase">
            <span>Critical Unresolved</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-rose-400 mt-2">{criticalCount}</p>
          <p className="text-[11px] text-rose-300/70 mt-1">Requires immediate response</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase">
            <span>Action Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Under investigation or open</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{resolvedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Action notes completed</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident by title, location, or guard name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="reported">Reported (Open)</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Feed */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-bold">Loading incident records...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">No Incidents Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No incidents match your current filter criteria or all patrol zones report normal status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => {
            const CategoryIcon = getCategoryIcon(incident.category)

            const severityStyles: Record<string, string> = {
              critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/50',
              high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            }

            const statusStyles: Record<string, string> = {
              reported: 'bg-amber-400 text-black font-black',
              investigating: 'bg-blue-500 text-white font-bold',
              resolved: 'bg-emerald-500 text-white font-bold',
              dismissed: 'bg-slate-700 text-slate-300 font-semibold',
            }

            return (
              <div
                key={incident.id}
                className={`bg-slate-900 border rounded-3xl p-5 transition hover:border-slate-700 ${
                  incident.severity === 'critical' && incident.status !== 'resolved'
                    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-slate-900'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${statusStyles[incident.status]}`}>
                        {incident.status}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black border ${severityStyles[incident.severity]}`}>
                        {incident.severity}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                        <CategoryIcon className="w-3 h-3" />
                        {incident.category.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(incident.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white">{incident.title}</h3>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                        {incident.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-bold">{incident.location_name}</span>
                        {incident.latitude && incident.longitude && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-300">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>Reported by: <strong className="text-white">{incident.reported_by_name}</strong></span>
                        {incident.reported_by_phone && (
                          <a
                            href={`tel:${incident.reported_by_phone}`}
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-0.5"
                          >
                            <Phone className="w-3 h-3" /> {incident.reported_by_phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {incident.action_taken && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                        <span className="text-emerald-400 font-bold block mb-0.5 text-[10px] uppercase tracking-wider">
                          ✓ Action Taken & Resolution:
                        </span>
                        <p className="text-slate-300">{incident.action_taken}</p>
                        {incident.resolved_at && (
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Resolved on {new Date(incident.resolved_at).toLocaleString()} by {incident.resolved_by || 'Admin'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Photo Evidence & Action Button */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3">
                    {incident.photo_url ? (
                      <button
                        onClick={() => setPhotoPreview(incident.photo_url!)}
                        className="relative rounded-2xl overflow-hidden border border-slate-700 hover:border-slate-500 transition group flex-shrink-0"
                      >
                        <img
                          src={incident.photo_url}
                          alt="Evidence"
                          className="w-28 h-20 sm:w-36 sm:h-24 object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> View Photo
                        </div>
                      </button>
                    ) : (
                      <div className="w-28 h-20 sm:w-36 sm:h-24 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-600 text-[10px] font-bold">
                        <span>No Photo</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedIncident(incident)
                        setResolutionStatus(incident.status === 'reported' ? 'investigating' : 'resolved')
                        setResolutionAction(incident.action_taken || '')
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Manage / Resolve</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resolution Management Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white">Manage Incident</h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-white font-bold text-sm">{selectedIncident.title}</p>
              <p className="text-slate-400">Location: {selectedIncident.location_name}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                Update Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['investigating', 'resolved', 'dismissed'] as IncidentStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setResolutionStatus(st)}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold capitalize border transition ${
                      resolutionStatus === st
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                Action Taken / Manager Notes
              </label>
              <textarea
                rows={3}
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
                placeholder="e.g. Electrician called, breaker reset, padlock replaced by maintenance..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2"
              >
                {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setPhotoPreview(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={photoPreview}
              alt="Incident Zoom Evidence"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border border-white/10 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
