import { NextResponse } from 'next/server'
import { sendPushToAllStaff } from '@/lib/web-push-sender'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await sendPushToAllStaff({
      title: '🚨 TEST REPORT: 01st Floor - Ladies Washroom',
      body: 'Visitor reported: Water leakage near sink (HIGH PRIORITY) — Lock Screen Push Test',
      url: '/app/tasks',
      tag: `muve-test-${Date.now()}`,
      category: 'MAINTENANCE',
      priority: 'high',
    })
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
