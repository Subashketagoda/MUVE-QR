import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SCANS, INITIAL_USERS, INITIAL_QR_CODES } from '@/lib/demo-store'
import backupQRCodes from '@/lib/initial-qr-codes.json'
import { QRCodeRow, ScanLogRow, UserRow } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '7d' // 'today' | '7d' | '30d' | 'all'
    const filterUserId = searchParams.get('userId') || ''

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let allScans: ScanLogRow[] = []
    let allUsers: UserRow[] = []
    let allQRCodes: QRCodeRow[] = []

    if (isSupabaseConfigured) {
      // 1. Fetch QR codes
      const { data: qrData } = await (supabaseAdmin as any)
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: true })
      allQRCodes = (qrData && qrData.length > 0 ? qrData : backupQRCodes) as QRCodeRow[]

      // 2. Fetch users
      const { data: userData } = await (supabaseAdmin as any)
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })
      allUsers = (userData && userData.length > 0 ? userData : INITIAL_USERS) as UserRow[]

      // 3. Fetch scans
      let query = (supabaseAdmin as any)
        .from('scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })

      if (filterUserId) {
        query = query.eq('user_id', filterUserId)
      }

      const { data: scanData } = await query
      allScans = (scanData || []) as ScanLogRow[]
    } else {
      allQRCodes = (backupQRCodes || INITIAL_QR_CODES) as QRCodeRow[]
      allUsers = INITIAL_USERS
      allScans = INITIAL_SCANS
      if (filterUserId) {
        allScans = allScans.filter((s) => s.user_id === filterUserId)
      }
    }

    // Filter by timeframe
    const now = new Date()
    let startDate: Date
    if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    } else if (timeframe === '7d') {
      startDate = new Date(now.getTime() - 7 * 86400000)
    } else if (timeframe === '30d') {
      startDate = new Date(now.getTime() - 30 * 86400000)
    } else {
      startDate = new Date(0) // all time
    }

    const filteredScans = allScans.filter((s) => {
      const d = new Date(s.scanned_at)
      return !isNaN(d.getTime()) && d >= startDate
    })

    const totalScans = filteredScans.length
    const successfulScans = filteredScans.filter((s) => s.status === 'success').length
    const rejectedScans = totalScans - successfulScans
    const successRate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 1000) / 10 : 100

    // Unique QR codes covered in period
    const totalCheckpoints = allQRCodes.length || 53
    const scannedQrTokens = new Set(filteredScans.map((s) => s.qr_token || s.qr_id))
    const checkpointsCoveredCount = scannedQrTokens.size
    const coverageRate = totalCheckpoints > 0
      ? Math.min(100, Math.round((checkpointsCoveredCount / totalCheckpoints) * 1000) / 10)
      : 0

    // Overall Compliance Score (Weighted: 60% coverage + 40% success rate)
    const complianceScore = Math.round(coverageRate * 0.6 + successRate * 0.4)

    // Average Pace calculation: compute average interval between sequential scans by the same officer
    const userScansMap: Record<string, ScanLogRow[]> = {}
    filteredScans.forEach((s) => {
      const uid = s.user_id || 'unknown'
      if (!userScansMap[uid]) userScansMap[uid] = []
      userScansMap[uid].push(s)
    })

    let totalIntervalMs = 0
    let intervalCount = 0

    Object.values(userScansMap).forEach((scans) => {
      const sorted = [...scans].sort(
        (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
      )
      for (let i = 1; i < sorted.length; i++) {
        const diffMs = new Date(sorted[i].scanned_at).getTime() - new Date(sorted[i - 1].scanned_at).getTime()
        // If scans were within 2 hours of each other, count as part of a patrol cycle
        if (diffMs > 0 && diffMs <= 2 * 3600 * 1000) {
          totalIntervalMs += diffMs
          intervalCount++
        }
      }
    })

    const avgPaceMinutes =
      intervalCount > 0 ? Math.round((totalIntervalMs / intervalCount / 60000) * 10) / 10 : 3.5

    // Officer Leaderboard
    const officerLeaderboard = allUsers
      .filter((u) => u.role !== 'admin' || (userScansMap[u.id] && userScansMap[u.id].length > 0))
      .map((u) => {
        const uScans = userScansMap[u.id] || []
        const uSuccess = uScans.filter((s) => s.status === 'success').length
        const uQrTokens = new Set(uScans.map((s) => s.qr_token || s.qr_id))
        const uDistinctQrs = uQrTokens.size
        const uCoveragePct =
          totalCheckpoints > 0 ? Math.min(100, Math.round((uDistinctQrs / totalCheckpoints) * 100)) : 0

        // User pace
        let uIntervalMs = 0
        let uIntervalCount = 0
        const sorted = [...uScans].sort(
          (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
        )
        for (let i = 1; i < sorted.length; i++) {
          const diff = new Date(sorted[i].scanned_at).getTime() - new Date(sorted[i - 1].scanned_at).getTime()
          if (diff > 0 && diff <= 2 * 3600 * 1000) {
            uIntervalMs += diff
            uIntervalCount++
          }
        }
        const uPace =
          uIntervalCount > 0 ? Math.round((uIntervalMs / uIntervalCount / 60000) * 10) / 10 : null

        const lastScan = uScans[0]?.scanned_at || null

        // Performance Score
        let score = Math.round(uCoveragePct * 0.7 + (uScans.length > 0 ? (uSuccess / uScans.length) * 30 : 0))
        let rating = 'Exceptional'
        if (score < 40) rating = 'Needs Review'
        else if (score < 75) rating = 'Good'

        return {
          id: u.id,
          full_name: u.full_name || 'Officer',
          email: u.email,
          phone: u.phone || 'N/A',
          role: u.role,
          total_scans: uScans.length,
          successful_scans: uSuccess,
          distinct_checkpoints: uDistinctQrs,
          coverage_pct: uCoveragePct,
          avg_pace_minutes: uPace,
          score,
          rating,
          last_scanned_at: lastScan,
        }
      })
      .sort((a, b) => b.total_scans - a.total_scans || b.score - a.score)

    // Checkpoint Visit Stats (Hotspots & Coldspots)
    const qrVisitCounts: Record<string, { count: number; lastScanned: string | null; qr: QRCodeRow }> = {}
    allQRCodes.forEach((q) => {
      const key = q.token || q.id
      qrVisitCounts[key] = { count: 0, lastScanned: null, qr: q }
    })

    filteredScans.forEach((s) => {
      const key = s.qr_token || s.qr_id
      if (qrVisitCounts[key]) {
        qrVisitCounts[key].count++
        if (!qrVisitCounts[key].lastScanned || new Date(s.scanned_at) > new Date(qrVisitCounts[key].lastScanned!)) {
          qrVisitCounts[key].lastScanned = s.scanned_at
        }
      }
    })

    const checkpointStats = Object.values(qrVisitCounts).map((item) => ({
      id: item.qr.id,
      name: item.qr.name,
      location_name: item.qr.location_name,
      token: item.qr.token,
      visits: item.count,
      last_scanned_at: item.lastScanned,
      status: item.count >= 3 ? 'Optimal' : item.count > 0 ? 'Moderate' : 'Unvisited',
    })).sort((a, b) => b.visits - a.visits)

    const topCheckpoints = checkpointStats.slice(0, 7)
    const neglectedCheckpoints = checkpointStats.filter((c) => c.visits === 0).slice(0, 7)

    // Floor-wise distribution
    const floorMap: Record<string, { visits: number; totalPoints: number }> = {}
    allQRCodes.forEach((q) => {
      const floor = q.location_name.includes('-')
        ? q.location_name.split('-')[0].trim()
        : q.location_name.includes('/')
        ? q.location_name.split('/')[0].trim()
        : 'Main Area'

      if (!floorMap[floor]) floorMap[floor] = { visits: 0, totalPoints: 0 }
      floorMap[floor].totalPoints++
    })

    filteredScans.forEach((s) => {
      const floor = s.location_name.includes('-')
        ? s.location_name.split('-')[0].trim()
        : s.location_name.includes('/')
        ? s.location_name.split('/')[0].trim()
        : 'Main Area'

      if (!floorMap[floor]) floorMap[floor] = { visits: 0, totalPoints: 0 }
      floorMap[floor].visits++
    })

    const floorDistribution = Object.entries(floorMap).map(([floor, val]) => ({
      floor,
      visits: val.visits,
      totalPoints: val.totalPoints,
      coveragePct: val.totalPoints > 0 ? Math.min(100, Math.round((val.visits / val.totalPoints) * 100)) : 0,
    })).slice(0, 8)

    // Time-series Activity Trend
    let trendData: { label: string; scans: number; success: number }[] = []
    if (timeframe === 'today') {
      // Group by hours 00:00 to 23:00
      const hourlyMap: Record<number, { scans: number; success: number }> = {}
      for (let h = 0; h < 24; h++) hourlyMap[h] = { scans: 0, success: 0 }

      filteredScans.forEach((s) => {
        const d = new Date(s.scanned_at)
        const h = d.getHours()
        if (hourlyMap[h]) {
          hourlyMap[h].scans++
          if (s.status === 'success') hourlyMap[h].success++
        }
      })

      trendData = Object.entries(hourlyMap).map(([h, val]) => ({
        label: `${String(h).padStart(2, '0')}:00`,
        scans: val.scans,
        success: val.success,
      }))
    } else {
      // Group by Days (last 7 or 30 days)
      const dayCount = timeframe === '30d' ? 30 : 7
      const dayMap: Record<string, { scans: number; success: number }> = {}

      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const dateKey = d.toISOString().split('T')[0]
        dayMap[dateKey] = { scans: 0, success: 0 }
      }

      filteredScans.forEach((s) => {
        const key = s.scanned_at.split('T')[0]
        if (dayMap[key]) {
          dayMap[key].scans++
          if (s.status === 'success') dayMap[key].success++
        }
      })

      trendData = Object.entries(dayMap).map(([key, val]) => {
        const d = new Date(key)
        const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        return {
          label,
          scans: val.scans,
          success: val.success,
        }
      })
    }

    return NextResponse.json({
      success: true,
      timeframe,
      kpis: {
        totalScans,
        successfulScans,
        rejectedScans,
        successRate,
        totalCheckpoints,
        checkpointsCoveredCount,
        coverageRate,
        complianceScore,
        avgPaceMinutes,
      },
      officerLeaderboard,
      checkpointStats,
      topCheckpoints,
      neglectedCheckpoints,
      floorDistribution,
      trendData,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
