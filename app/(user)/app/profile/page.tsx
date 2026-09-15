'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Mail,
  Phone,
  Shield,
  LogOut,
  CheckCircle2,
  QrCode,
  ArrowLeft,
  Smartphone,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'

export default function UserProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('muve_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (e) {}
    } else {
      setUser({
        id: '00000000-0000-0000-0000-000000000002',
        full_name: 'User 01',
        phone: '077 111 1111',
        role: 'user',
        status: 'active',
      })
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('muve_user')
    document.cookie = 'muve_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const handleClearCache = () => {
    localStorage.removeItem('muve_local_scans')
    toast.success('Local scan cache cleared')
  }

  if (!user) return null

  return (
    <div className="p-4 space-y-5">
      {/* Top Header */}
      <div className="flex items-center gap-2.5 pt-1">
        <Link
          href="/app/home"
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">User Profile</h1>
          <p className="text-[11px] text-slate-500 font-medium">Account status & app preferences</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div className="bg-gradient-to-b from-white to-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-3 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-xl" />

        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25 border-4 border-white">
            {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U1'}
          </div>
          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{user.full_name}</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{user.phone || '077 111 1111'}</p>
        </div>

        <div className="flex justify-center gap-2 pt-1">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Account
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
            {user.role}
          </span>
        </div>
      </div>

      {/* Account Info Details */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        <div className="p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Registered Phone</p>
            <p className="font-extrabold text-slate-900 text-sm">{user.phone || '077 111 1111'}</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Authorization</p>
            <p className="font-extrabold text-slate-900 text-sm uppercase">MUVE QR {user.role}</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Application Build</p>
            <p className="font-extrabold text-slate-900 text-sm">v1.0.2 (Production Live)</p>
          </div>
          <Link
            href="/download"
            className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition"
          >
            APK
          </Link>
        </div>
      </div>

      {/* Quick Settings & Reset */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Device Maintenance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-xs text-slate-900">Clear Local Scan Cache</p>
            <p className="text-[11px] text-slate-400">Resets device offline cache if sync delays</p>
          </div>
          <button
            onClick={handleClearCache}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
            title="Reset offline cache"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logout Action Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-sm shadow-lg shadow-red-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out Account</span>
      </button>
    </div>
  )
}
