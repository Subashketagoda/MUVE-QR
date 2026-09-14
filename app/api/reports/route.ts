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
        .select(`
          *,
          users ( full_name, email ),
          qr_codes ( name, location_name )
        `)
        .order('scanned_at', { ascending: false })

      if (startDate) query = query.gte('scanned_at', startDate)
      if (endDate) query = query.lte('scanned_at', endDate)
      if (userId) query = query.eq('user_id', userId)
      if (qrId) query = query.eq('qr_id', qrId)
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error

      const reportData = (data || []).map((row: any) => ({
        id: row.id,
        date: new Date(row.scanned_at).toLocaleDateString('en-GB'),
        time: new Date(row.scanned_at).toLocaleTimeString('en-US', { hour12: false }),
        user: row.users?.full_name || 'User ' + row.user_id.slice(-4),
        user_email: row.users?.email || '',
        qr: row.qr_name,
        location: row.location_name,
        token: row.qr_token,
        status: row.status,
        device: row.device_info || 'N/A',
        latitude: row.latitude ?? 'N/A',
        longitude: row.longitude ?? 'N/A',
        scanned_at: row.scanned_at,
      }))

      return NextResponse.json({ success: true, report: reportData })
    }

    // Demo store fallback
    let filtered = [...INITIAL_SCANS]
    if (startDate) filtered = filtered.filter((s) => new Date(s.scanned_at) >= new Date(startDate))
    if (endDate) filtered = filtered.filter((s) => new Date(s.scanned_at) <= new Date(endDate))
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
