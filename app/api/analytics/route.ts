import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SCANS, INITIAL_USERS, INITIAL_QR_CODES } from '@/lib/demo-store'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let totalUsers = 0
    let activeUsers = 0
    let totalQRCodes = 0
    let scansToday = 0
    let scansThisWeek = 0
    let scansThisMonth = 0
    let allScans: any[] = []

    if (isSupabaseConfigured) {
      const { count: uCount } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
      const { count: auCount } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active')
      const { count: qrCount } = await supabaseAdmin.from('qr_codes').select('*', { count: 'exact', head: true })
      
      totalUsers = uCount || 0
      activeUsers = auCount || 0
      totalQRCodes = qrCount || 0

      const { data: scans } = await supabaseAdmin
        .from('scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })

      allScans = scans || []
    } else {
      totalUsers = INITIAL_USERS.length
      activeUsers = INITIAL_USERS.filter((u) => u.status === 'active').length
      totalQRCodes = INITIAL_QR_CODES.length
      allScans = INITIAL_SCANS
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekStart = new Date(now.getTime() - 7 * 86400000).getTime()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    scansToday = allScans.filter((s) => new Date(s.scanned_at).getTime() >= todayStart).length
    scansThisWeek = allScans.filter((s) => new Date(s.scanned_at).getTime() >= weekStart).length
    scansThisMonth = allScans.filter((s) => new Date(s.scanned_at).getTime() >= monthStart).length

    // 1. Scans per day (last 7 days)
    const daysMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = d.toISOString().split('T')[0]
      daysMap[key] = 0
    }
    allScans.forEach((s) => {
      const key = s.scanned_at.split('T')[0]
      if (daysMap[key] !== undefined) {
        daysMap[key]++
      }
    })
    const scansPerDay = Object.entries(daysMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scans: count,
    }))

    // 2. Scans by QR Code
    const qrMap: Record<string, number> = {}
    allScans.forEach((s) => {
      qrMap[s.qr_name] = (qrMap[s.qr_name] || 0) + 1
    })
    const scansByQR = Object.entries(qrMap).map(([qr, count]) => ({
      qr,
      scans: count,
    }))

    // 3. Scans by User
    const userMap: Record<string, number> = {}
    allScans.forEach((s) => {
      let uName = s.user_name || 'User 01'
      if (!s.user_name) {
        const u = INITIAL_USERS.find((user) => user.id === s.user_id)
        if (u) uName = u.full_name
      }
      userMap[uName] = (userMap[uName] || 0) + 1
    })
    const scansByUser = Object.entries(userMap).map(([user, count]) => ({
      user,
      scans: count,
    }))

    // 4. Hourly Scan Activity (00:00 - 23:00)
    const hourlyMap: number[] = new Array(24).fill(0)
    allScans.forEach((s) => {
      const hour = new Date(s.scanned_at).getHours()
      hourlyMap[hour]++
    })
    const hourlyActivity = hourlyMap.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      scans: count,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalQRCodes,
        scansToday,
        scansThisWeek,
        scansThisMonth,
      },
      charts: {
        scansPerDay,
        scansByQR,
        scansByUser,
        hourlyActivity,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
