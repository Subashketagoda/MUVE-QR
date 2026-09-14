'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/shared/Logo'
import {
  LayoutDashboard,
  Radio,
  History,
  QrCode,
  Users,
  FileBarChart2,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react'

interface AdminSidebarProps {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const pathname = usePathname()

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/live-scans', label: 'Live Scans', icon: Radio, badge: 'LIVE' },
    { href: '/admin/scan-history', label: 'Scan History', icon: History },
    { href: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
    { href: '/admin/audit-log', label: 'Audit Log', icon: ShieldAlert },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Header Branding */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <Link href="/admin/dashboard" className="inline-block">
            <Logo size="sm" showSubtitle={true} subtitleText="COLOMBO" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tagline */}
        <div className="px-6 py-2">
          <p className="text-[10px] font-bold tracking-widest text-[#D4FC04] uppercase">
            SCAN • TRACK • MOVE FORWARD
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500 text-white rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Admin Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">System Admin</p>
              <p className="text-[11px] text-slate-400 truncate">admin@muveqr.app</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
