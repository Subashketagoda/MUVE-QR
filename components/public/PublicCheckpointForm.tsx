'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Sparkles,
  ShieldAlert,
  ClipboardCheck,
  MessageSquare,
  Send,
  Loader2,
  Clock,
  User,
  Phone,
  Building,
} from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

interface PublicCheckpointFormProps {
  token: string
}

export const PublicCheckpointForm: React.FC<PublicCheckpointFormProps> = ({ token }) => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkpoint, setCheckpoint] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [category, setCategory] = useState<string>('cleaning')
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [description, setDescription] = useState('')
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null)

  // Fetch checkpoint details
  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/scan/public-info?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.success && data.checkpoint) {
          setCheckpoint(data.checkpoint)
        } else {
          setError(data.message || 'QR Checkpoint not found')
        }
      } catch (e: any) {
        setError('Network error fetching checkpoint details')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInfo()
    }
  }, [token])

  const categories = [
    {
      id: 'cleaning',
      label: 'Cleaning & Hygiene',
      icon: Sparkles,
      color: 'bg-emerald-500 text-white',
      border: 'border-emerald-500',
      description: 'Restroom supplies, trash emptying, spill cleanup',
      quickTags: ['Washroom needs cleaning', 'Out of hand soap/paper', 'Spill on the floor', 'Trash bin full'],
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Repair',
      icon: Wrench,
      color: 'bg-blue-600 text-white',
      border: 'border-blue-600',
      description: 'AC, plumbing leak, electrical, light bulb, door lock',
      quickTags: ['Water leakage', 'AC not cooling', 'Light bulb flickering/out', 'Door lock issue', 'Power outlet issue'],
    },
    {
      id: 'security',
      label: 'Security & Safety',
      icon: ShieldAlert,
      color: 'bg-rose-600 text-white',
      border: 'border-rose-600',
      description: 'Hazard, blocked fire exit, suspicious activity',
      quickTags: ['Slippery/hazard floor', 'Fire exit blocked', 'Unattended bag/item', 'Noise/disturbance'],
    },
    {
      id: 'visitor_checkin',
      label: 'Visitor / Contractor Log',
      icon: ClipboardCheck,
      color: 'bg-purple-600 text-white',
      border: 'border-purple-600',
      description: 'Log presence at this location for attendance/audit',
      quickTags: ['Service contractor check-in', 'Auditor inspection', 'Delivery completed', 'Client meeting'],
    },
    {
      id: 'other',
      label: 'General Assistance',
      icon: MessageSquare,
      color: 'bg-slate-700 text-white',
      border: 'border-slate-700',
      description: 'General inquiry or feedback regarding this area',
      quickTags: ['General inquiry', 'Lost item report', 'Staff assistance needed'],
    },
  ]

  const activeCatObj = categories.find((c) => c.id === category) || categories[0]

  const handleQuickTagClick = (tag: string) => {
    if (!description) {
      setDescription(tag)
    } else if (!description.includes(tag)) {
      setDescription(`${description}, ${tag}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/scan/public-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: token,
          category,
          reporterName: reporterName.trim() || 'Visitor',
          reporterContact: reporterContact.trim(),
          priority,
          description: description.trim(),
          deviceInfo: typeof navigator !== 'undefined' ? `${navigator.userAgent}` : '',
        }),
      })

      const data = await res.json()
      if (data.success && data.ticketId) {
        setSubmittedTicket(data.ticketId)
      } else {
        alert(data.message || 'Submission failed. Please try again.')
      }
    } catch (err) {
      alert('Network error while submitting report. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050D1A] flex flex-col items-center justify-center p-6 text-white text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4FC04] mb-4" />
        <p className="font-bold text-lg">Verifying Checkpoint...</p>
        <p className="text-xs text-slate-400 mt-1">Reading location details from secure database</p>
      </div>
    )
  }

  // 2. Error State
  if (error || !checkpoint) {
    return (
      <div className="min-h-screen bg-[#050D1A] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/40">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black">Checkpoint Not Recognized</h1>
        <p className="text-sm text-slate-400 max-w-sm mt-2">
          {error || 'This QR code token is not active in the MUVE facility system.'}
        </p>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
        >
          Staff & Guard Login
        </Link>
      </div>
    )
  }

  // 3. Success State after submission
  if (submittedTicket) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-5 text-white">
        <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0A1628] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Report Dispatched
            </span>
            <h2 className="text-2xl font-black text-white mt-2">Thank You!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your request has been logged and alerted to on-duty facility officers and management.
            </p>
          </div>

          {/* Ticket Information Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Reference Ticket:</span>
              <span className="font-mono font-black text-[#D4FC04] text-sm">{submittedTicket}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Verified Location:</span>
              <span className="font-bold text-white truncate max-w-[200px]">{checkpoint.location_name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Issue Category:</span>
              <span className="font-semibold text-blue-400 capitalize">{category.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Recorded At:</span>
              <span className="text-slate-300">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setSubmittedTicket(null)
                setDescription('')
              }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
            >
              Submit Another Report at this Point
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              MUVE QR Facility Management & Security Patrol System
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 4. Main Public Form
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <Logo size="sm" showSubtitle={true} subtitleText="FACILITY SERVICES" />
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-[#D4FC04]/20 text-[#D4FC04] border border-[#D4FC04]/30">
            Public Access
          </span>
        </div>

        {/* Verified Location Card (Top Badge) */}
        <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-500/40 p-4 sm:p-5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Verified Building Checkpoint
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {checkpoint.location_name}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>{checkpoint.floor} · {checkpoint.description}</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* The Incident / Assistance Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-white">Facility & Security Assistance Form</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select what you are reporting at this location. On-duty staff will be dispatched.
            </p>
          </div>

          {/* 1. Category Selection Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. What is this regarding?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-slate-800 border-[#D4FC04] ring-2 ring-[#D4FC04]/20 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-[#D4FC04] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Tags for Active Category */}
          {activeCatObj.quickTags && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Quick issue tags (tap to add):</label>
              <div className="flex flex-wrap gap-1.5">
                {activeCatObj.quickTags.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Description Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Details / Notes <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, requested item, or reason for check-in..."
              className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* 3. Name & Phone Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Your Name
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Kamal Perera / Visitor"
                className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact Phone / WhatsApp
              </label>
              <input
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="e.g. 077 123 4567"
                className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 4. Priority selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Routine / Low', color: 'border-slate-700 text-slate-300' },
                { id: 'medium', label: 'Standard / Normal', color: 'border-blue-600 text-blue-300' },
                { id: 'urgent', label: '🚨 Urgent / Emergency', color: 'border-rose-600 text-rose-300' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                    priority === p.id
                      ? 'bg-slate-800 border-[#D4FC04] text-[#D4FC04] shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="w-full py-3.5 rounded-2xl bg-[#D4FC04] hover:bg-[#c2e803] text-slate-950 font-black text-sm shadow-xl shadow-[#D4FC04]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching to Staff...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Report to Facility Staff</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 pt-6">
        MUVE QR Facility Patrol & Operations Intelligence Platform
      </footer>
    </div>
  )
}
