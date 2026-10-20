'use client'

import React, { useState, useEffect } from 'react'
import {
  Radio,
  Shield,
  Volume2,
  VolumeX,
  Users,
  AlertTriangle,
  Send,
  RefreshCw,
  Headphones,
  Signal,
  CheckCircle2,
  Mic,
} from 'lucide-react'
import { WalkieTalkieWidget } from '@/components/shared/WalkieTalkieWidget'
import { WALKIE_CHANNELS } from '@/lib/walkie-talkie-store'

export default function AdminWalkieTalkiePage() {
  const [currentUser, setCurrentUser] = useState({
    id: 'usr_admin_001',
    full_name: 'Control Room Dispatch',
    role: 'dispatcher' as const,
  })

  useEffect(() => {
    const saved = localStorage.getItem('muve_user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.role === 'admin') {
          setCurrentUser({
            id: parsed.id || 'usr_admin_001',
            full_name: parsed.full_name || 'Control Room Dispatch',
            role: 'dispatcher',
          })
        }
      } catch (e) {}
    }
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#072B3B] to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl text-white">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>DISPATCH VOICE NET ACTIVE • FULL DUPLEX READY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>Walkie-Talkie Tactical Dispatch</span>
            <Radio className="w-7 h-7 text-[#D4FC04]" />
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Live two-way Push-to-Talk (PTT) radio console. Transmit directly to patrol officers on duty,
            monitor security frequencies, and broadcast priority 10-codes.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Operator Callsign</span>
            <span className="text-sm font-black font-mono text-[#D4FC04]">DISPATCH-HQ</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Tactical Radio Center + Operational Channel Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Interactive Walkie-Talkie Console */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-lg">
            <WalkieTalkieWidget currentUser={currentUser} defaultChannelId="ch_1" />
          </div>
        </div>

        {/* Right: Security Channels Directory & Quick Guide */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Channel Frequency Directory */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Signal className="w-4 h-4 text-[#D4FC04]" />
                <span>Tactical Channels ({WALKIE_CHANNELS.length})</span>
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                FM 25kHz
              </span>
            </div>

            <div className="space-y-3">
              {WALKIE_CHANNELS.map((ch) => (
                <div
                  key={ch.id}
                  className={`p-3.5 rounded-2xl border ${
                    ch.isEmergency
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-[#D4FC04]">
                      {ch.code}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {ch.frequency}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{ch.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{ch.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical 10-Code Standard Reference */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg text-white space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <Headphones className="w-4 h-4 text-emerald-400" />
              <span>Standard Security 10-Codes</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="font-bold text-[#D4FC04]">10-4</span>
                <span className="text-slate-300">Message Acknowledged / Copy</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="font-bold text-[#D4FC04]">10-20</span>
                <span className="text-slate-300">Report Current Location</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="font-bold text-[#D4FC04]">10-8</span>
                <span className="text-slate-300">In Service / On Active Patrol</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="font-bold text-[#D4FC04]">10-6</span>
                <span className="text-slate-300">Busy, Stand By</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-500/40">
                <span className="font-bold text-rose-400">10-33</span>
                <span className="text-rose-200">Emergency / Officer Needs Help</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
