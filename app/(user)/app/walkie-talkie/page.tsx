'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Radio, Shield, Volume2, Info } from 'lucide-react'
import { WalkieTalkieWidget } from '@/components/shared/WalkieTalkieWidget'

export default function UserWalkieTalkiePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('muve_user')
    let currentUsr = {
      id: '00000000-0000-0000-0000-000000000002',
      full_name: 'User 01',
      phone: '077 111 1111',
      role: 'user',
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.id === 'usr_user_001') {
          parsed.id = '00000000-0000-0000-0000-000000000002'
        }
        currentUsr = parsed
      } catch (e) {}
    }
    setUser(currentUsr)
  }, [])

  return (
    <div className="min-h-full pb-10 bg-slate-950 text-white">
      {/* Top Tactical Header */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/home"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                NET ACTIVE • 2-WAY PTT
              </span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Walkie-Talkie Radio</span>
              <Radio className="w-4 h-4 text-[#D4FC04]" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-slate-900 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800">
            {user?.full_name ? user.full_name.substring(0, 10) : 'PATROL-01'}
          </span>
        </div>
      </div>

      {/* Main Radio Interface */}
      <div className="px-3 pt-3">
        <WalkieTalkieWidget
          currentUser={
            user || {
              id: '00000000-0000-0000-0000-000000000002',
              full_name: 'User 01',
              role: 'user',
            }
          }
        />
      </div>
    </div>
  )
}
