'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/shared/Logo'
import { toast } from 'sonner'
import { LogIn, ArrowRight, Phone, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
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
      document.cookie = `muve_session=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`

      const targetUrl = data.user.role === 'admin' ? '/admin/dashboard' : '/app/home'
      window.location.href = targetUrl
    } catch (err: any) {
      toast.error('Network error during login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#072B3B] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Sign In</h2>
          <p className="text-slate-500 text-xs sm:text-sm mb-6">
            Enter your mobile phone number and password to access MUVE QR
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Mobile Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 077 111 1111"
                className="input text-slate-900 font-medium"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input text-slate-900"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary btn-lg mt-2 font-black shadow-lg shadow-blue-600/25 cursor-pointer active:scale-[0.98] transition"
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
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          MUVE QR Platform &copy; {new Date().getFullYear()} • Enterprise Location & Activity Intelligence
        </p>
      </div>
    </div>
  )
}
