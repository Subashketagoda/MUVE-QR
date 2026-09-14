'use client'

import React from 'react'
import { UserBottomNav } from '@/components/user/UserBottomNav'

export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="user-app">
        <main className="pb-24">{children}</main>
        <UserBottomNav />
      </div>
    </div>
  )
}
