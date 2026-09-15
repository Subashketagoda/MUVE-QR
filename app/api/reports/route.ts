import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SCANS, INITIAL_USERS } from '@/lib/demo-store'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const qrId = searchParams.get('qrId')
    const status = searchParams.get('status')

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      let query = supabaseAdmin
        .from('scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })

      if (startDate) {
        const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
        query = query.gte('scanned_at', start)
      }
      if (endDate) {
        const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
        query = query.lte('scanned_at', end)
      }
      if (userId) query = query.eq('user_id', userId)
      if (qrId) query = query.eq('qr_id', qrId)
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error

      // Enrich with user names safely without foreign key join
      const userIds = Array.from(new Set((data || []).map((d: any) => d.user_id).filter(Boolean)))
      const userMap: Record<string, { full_name: string; email: string }> = {}
      if (userIds.length > 0) {
        try {
          const { data: uData } = await (supabaseAdmin as any)
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds)
          if (uData) {
            uData.forEach((u: any) => {
              userMap[u.id] = { full_name: u.full_name, email: u.email }
            })
          }
        } catch (e) {}
      }

      const reportData = (data || []).map((row: any) => ({
        id: row.id,
        date: new Date(row.scanned_at).toLocaleDateString('en-GB'),
        time: new Date(row.scanned_at).toLocaleTimeString('en-US', { hour12: false }),
        user:
          userMap[row.user_id]?.full_name ||
          (row.user_id === '00000000-0000-0000-0000-000000000001'
            ? 'System Admin'
            : row.user_id === '00000000-0000-0000-0000-000000000002'
            ? 'User 01'
            : 'User ' + (row.user_id ? String(row.user_id).slice(-4) : '')),
        user_email: userMap[row.user_id]?.email || '',
        qr: row.qr_name || 'N/A',
        location: row.location_name || 'N/A',
        token: row.qr_token || 'N/A',
        status: row.status || 'verified',
        device: row.device_info || 'Mobile Device',
        latitude: row.latitude ?? 'N/A',
        longitude: row.longitude ?? 'N/A',
        scanned_at: row.scanned_at,
      }))

      return NextResponse.json({ success: true, report: reportData })
    }

    // Demo store fallback
    let filtered = [...INITIAL_SCANS]
    if (startDate) {
      const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`)
      filtered = filtered.filter((s) => new Date(s.scanned_at) >= start)
    }
    if (endDate) {
      const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`)
      filtered = filtered.filter((s) => new Date(s.scanned_at) <= end)
    }
    if (userId) filtered = filtered.filter((s) => s.user_id === userId)
    if (qrId) filtered = filtered.filter((s) => s.qr_id === qrId)
    if (status) filtered = filtered.filter((s) => s.status === status)

    const reportData = filtered.map((row) => {
      const u = INITIAL_USERS.find((user) => user.id === row.user_id)
      return {
        id: row.id,
        date: new Date(row.scanned_at).toLocaleDateString('en-GB'),
        time: new Date(row.scanned_at).toLocaleTimeString('en-US', { hour12: false }),
        user: u?.full_name || 'User 01',
        user_email: u?.email || '',
        qr: row.qr_name,
        location: row.location_name,
        token: row.qr_token,
        status: row.status,
        device: row.device_info || 'Mobile Device',
        latitude: row.latitude ?? 'N/A',
        longitude: row.longitude ?? 'N/A',
        scanned_at: row.scanned_at,
      }
    })

    return NextResponse.json({ success: true, report: reportData })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
