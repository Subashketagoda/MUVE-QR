'use client'

import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { 
  QrCode, 
  ShieldCheck, 
  Activity, 
  MapPin, 
  FileSpreadsheet, 
  Users, 
  ArrowRight, 
  Smartphone, 
  LayoutDashboard,
  Sparkles,
  CheckCircle2
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy-950 text-white selection:bg-[#D4FC04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#D4FC04]/5 blur-[140px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[160px]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/10 bg-navy-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" variant="dark" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/download"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-[#D4FC04] border border-[#D4FC04]/30 transition shadow-sm"
            >
              <Smartphone className="w-4 h-4" />
              Download APK
            </Link>
            <Link
              href="/app/home"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              Staff App
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#D4FC04] text-black hover:bg-[#bce003] transition shadow-lg shadow-[#D4FC04]/20"
            >
              Portal Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Link
            href="/download"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#D4FC04]/40 text-xs font-semibold uppercase tracking-wider text-[#D4FC04] mb-8 transition group"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android APK & PWA Available • Download v1.0.0
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
            SCAN <span className="text-[#D4FC04]">•</span> TRACK{' '}
            <span className="text-[#D4FC04]">•</span> MOVE FORWARD
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl font-normal leading-relaxed mb-10">
            Next-generation QR code intelligence platform. Real-time scanning telemetry, 
            geofenced security verifications, attendance tracking, and comprehensive management dashboards.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/download"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#D4FC04] text-black font-extrabold text-base hover:bg-[#bce003] transition shadow-xl shadow-[#D4FC04]/25 group"
            >
              <Smartphone className="w-5 h-5" />
              Download Android APK
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/admin/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-base backdrop-blur-sm transition"
            >
              <LayoutDashboard className="w-5 h-5" />
              Admin Portal
            </Link>

            <Link
              href="/app/scan"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-semibold text-base transition"
            >
              <QrCode className="w-5 h-5 text-[#D4FC04]" />
              Web Scanner
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4FC04]" />
              Instant Camera QR Recognition
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4FC04]" />
              Precise Location & Activity Logging
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4FC04]" />
              Automated PDF & CSV Reports
            </span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-[#D4FC04]/10 border border-[#D4FC04]/20 flex items-center justify-center text-[#D4FC04] mb-6 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Dynamic QR Generation</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Generate encrypted, high-resolution QR codes with customizable brand presets. Download as SVG, PNG or auto-formatted PDF sheets.
            </p>
            <Link href="/admin/qr-codes" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              Manage QR Codes &rarr;
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Telemetry & Feed</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Monitor active scans in real time with location coordinates, user identification, status tags, and instant anomaly notifications.
            </p>
            <Link href="/admin/live-scans" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              Live Scans View &rarr;
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Location & Check-in Tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Track multi-location scanning points, facility entry logs, and time-stamped activity across all checkpoints.
            </p>
            <Link href="/admin/scan-history" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              View History & Logs &rarr;
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Compliance & Reports</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Export comprehensive attendance logs, audit logs, and analytics in CSV, Excel, or formatted PDF for leadership and regulatory review.
            </p>
            <Link href="/admin/reports" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              Generate Reports &rarr;
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">User & Staff Management</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Role-based control with separate administrative dashboards, field user applications, and session security protections.
            </p>
            <Link href="/admin/users" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              Manage Users &rarr;
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4FC04]/40 transition group">
            <div className="w-12 h-12 rounded-xl bg-[#D4FC04]/10 border border-[#D4FC04]/20 flex items-center justify-center text-[#D4FC04] mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Enterprise Security</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              End-to-end audit logging, anti-tamper validations, Supabase Row-Level Security, and automated failover demo resilience.
            </p>
            <Link href="/admin/audit-log" className="text-sm font-semibold text-[#D4FC04] hover:underline inline-flex items-center gap-1">
              Audit Logs &rarr;
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500 relative z-10">
        <p>© {new Date().getFullYear()} MUVE QR. Enterprise Activity, Attendance & Location Tracking Platform.</p>
      </footer>
    </div>
  )
}
