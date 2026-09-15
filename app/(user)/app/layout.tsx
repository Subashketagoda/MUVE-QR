'use client'

import React from 'react'
import { UserBottomNav } from '@/components/user/UserBottomNav'

export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 min-h-screen sm:py-6 flex justify-center">
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] bg-slate-50 relative sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <main className="flex-1 pb-24 overflow-y-auto">{children}</main>
        <UserBottomNav />
      </div>
    </div>
  )
}
