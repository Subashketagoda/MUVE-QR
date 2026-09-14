import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SCANS, INITIAL_USERS, INITIAL_QR_CODES } from '@/lib/demo-store'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const qrId = searchParams.get('qrId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

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
        .limit(limit)

      if (userId) query = query.eq('user_id', userId)
      if (qrId) query = query.eq('qr_id', qrId)
      if (status) query = query.eq('status', status)
      if (search) {
        query = query.or(
          `location_name.ilike.%${search}%,qr_name.ilike.%${search}%,qr_token.ilike.%${search}%`
        )
      }

      const { data, error } = await query
        .order('scanned_at', { ascending: false })

      if (error) throw error

      // Enrich with user full name if available
      const enriched = (data || []).map((item: any) => ({
        ...item,
        user_name: item.users?.full_name || 'User ' + item.user_id.slice(-4),
        user_email: item.users?.email || '',
      }))

      return NextResponse.json({ success: true, scans: enriched })
    }

    // Demo store fallback
    let filtered = [...INITIAL_SCANS]
    if (userId) filtered = filtered.filter((s) => s.user_id === userId)
    if (qrId) filtered = filtered.filter((s) => s.qr_id === qrId)
    if (status) filtered = filtered.filter((s) => s.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.location_name.toLowerCase().includes(q) ||
          s.qr_name.toLowerCase().includes(q) ||
          s.qr_token.toLowerCase().includes(q)
      )
    }

    const enriched = filtered.slice(0, limit).map((s) => {
      const u = INITIAL_USERS.find((user) => user.id === s.user_id)
      return {
        ...s,
        user_name: u?.full_name || 'User 01',
        user_email: u?.email || '',
      }
    })

    return NextResponse.json({ success: true, scans: enriched })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
