'use client'

import React from 'react'
import { UserBottomNav } from '@/components/user/UserBottomNav'

export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#072B3B] to-slate-950 flex justify-center items-center sm:p-4 selection:bg-[#D4FC04] selection:text-black">
      {/* Ambient background lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#D4FC04]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[180px]" />
      </div>

      {/* Main Flagship Phone App Frame */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] sm:max-h-[920px] bg-slate-50 relative sm:rounded-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col overflow-hidden z-10">
        {/* Subtle Top Notch/Speaker Bar on desktop preview */}
        <div className="hidden sm:flex justify-center pt-2 pb-1 bg-[#072B3B]">
          <div className="w-20 h-1 rounded-full bg-white/20" />
        </div>

        {/* Scrollable App Viewport */}
        <main className="flex-1 pb-28 overflow-y-auto scrollbar-none overscroll-contain">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation */}
        <UserBottomNav />
      </div>
    </div>
  )
}
