'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, QrCode, History, User } from 'lucide-react'

export const UserBottomNav: React.FC = () => {
  const pathname = usePathname()

  const navItems = [
    { href: '/app/home', label: 'Home', icon: Home },
    { href: '/app/scan', label: 'Scan', icon: QrCode, isScanBtn: true },
    { href: '/app/history', label: 'History', icon: History },
    { href: '/app/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          if (item.isScanBtn) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-6 group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white transition transform group-active:scale-95 ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-blue-500/40 ring-2 ring-blue-500'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/30'
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 transition ${
                    isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'
                  }`}
                >
                  Scan
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
