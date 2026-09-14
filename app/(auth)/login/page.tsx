'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/shared/Logo'
import { toast } from 'sonner'
import { LogIn, ShieldCheck, UserCheck, ArrowRight, QrCode } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@muveqr.app')
  const [password, setPassword] = useState('Admin@123456')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast.error(data.message || 'Login failed')
        setLoading(false)
        return
      }

      toast.success(`Welcome back, ${data.user.full_name}!`)

      // Save user session details in localStorage for client state persistence
      localStorage.setItem('muve_user', JSON.stringify(data.user))

      const targetUrl = data.user.role === 'admin' ? '/admin/dashboard' : '/app/home'
      window.location.href = targetUrl
    } catch (err: any) {
      toast.error('Network error during login')
      setLoading(false)
    }
  }

  const fillDemoAccount = (role: 'admin' | 'user01' | 'user02') => {
    if (role === 'admin') {
      setEmail('admin@muveqr.app')
      setPassword('Admin@123456')
    } else if (role === 'user01') {
      setEmail('user01@muveqr.app')
      setPassword('User@123456')
    } else {
      setEmail('user02@muveqr.app')
      setPassword('User@123456')
    }
  }

  return (
    <div className="min-h-screen bg-[#072B3B] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Glowing Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#D4FC04]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showSubtitle={true} subtitleText="COLOMBO" />
          </div>
          <p className="text-sm font-semibold tracking-widest text-[#D4FC04] uppercase mt-2">
            SCAN • TRACK • MOVE FORWARD
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter your credentials to access the MUVE QR portal
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="form-input text-slate-900"
              />
            </div>

            <div>
              <label className="form-label text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary btn-lg mt-2 font-semibold shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              One-Click Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="p-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('user01')}
                className="p-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>User 01</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('user02')}
                className="p-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-purple-600" />
                <span>User 02</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          MUVE QR Platform &copy; {new Date().getFullYear()} • Enterprise Location & Activity Intelligence
        </p>
      </div>
    </div>
  )
}
