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
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        if (item.isScanBtn) {
          return (
            <Link key={item.href} href={item.href} className="bottom-nav-item scan-btn">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-4 border-white transition active:scale-95">
                <Icon className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-1">Scan</span>
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
