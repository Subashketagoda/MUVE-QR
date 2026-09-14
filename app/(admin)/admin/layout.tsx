'use client'

import React, { useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopNav } from '@/components/admin/AdminTopNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="admin-layout">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="admin-main">
        <AdminTopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
