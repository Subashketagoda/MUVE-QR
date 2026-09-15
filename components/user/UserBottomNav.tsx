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
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className="max-w-md mx-auto px-4 pt-1 pointer-events-auto"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-3xl px-4 h-16 flex items-center justify-around relative">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.isScanBtn) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-8 group focus:outline-none"
                >
                  <div className="relative">
                    {/* Glowing aura around scan button */}
                    <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-md group-hover:bg-blue-500/50 transition" />
                    <div
                      className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-white transition transform group-active:scale-90 ${
                        isActive
                          ? 'bg-gradient-to-tr from-blue-700 to-indigo-700 text-[#D4FC04] ring-2 ring-blue-500 shadow-blue-600/40'
                          : 'bg-gradient-to-tr from-[#072B3B] via-blue-600 to-indigo-600 text-white shadow-blue-600/30 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold mt-1 tracking-wider transition ${
                      isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-blue-600'
                    }`}
                  >
                    SCAN
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-blue-600 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-700 active:scale-95'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
