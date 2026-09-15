'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Shield, LogOut, CheckCircle2, QrCode } from 'lucide-react'
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
        id: 'usr_user_001',
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
    toast.success('Logged out')
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">User Profile</h1>
        <p className="text-xs text-slate-500">Account status and personal details</p>
      </div>

      {/* User Card */}
      <div className="card p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-extrabold text-2xl mx-auto flex items-center justify-center shadow-lg">
          {user.full_name[0]}
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id}</p>
        </div>

        <div className="flex justify-center gap-2 pt-2">
          <span className="badge badge-success flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            Account Active
          </span>
          <span className="badge badge-navy text-[10px] uppercase">{user.role}</span>
        </div>
      </div>

      {/* Details List */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-3 text-xs">
          <Phone className="w-4 h-4 text-blue-600" />
          <div className="flex-1">
            <p className="text-slate-400">Mobile Phone Number</p>
            <p className="font-bold text-slate-900 text-sm">{user.phone || '077 111 1111'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs pt-3 border-t border-slate-100">
          <Shield className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <p className="text-slate-400">Access Level</p>
            <p className="font-semibold text-slate-800 uppercase">{user.role} Account</p>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full btn btn-danger btn-lg shadow-lg font-bold"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </button>
    </div>
  )
}
