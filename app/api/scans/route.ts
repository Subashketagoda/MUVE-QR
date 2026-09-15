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
        .select('*')
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

      const enriched = (data || []).map((item: any) => ({
        ...item,
        user_name:
          userMap[item.user_id]?.full_name ||
          (item.user_id === '00000000-0000-0000-0000-000000000001'
            ? 'System Admin'
            : item.user_id === '00000000-0000-0000-0000-000000000002'
            ? 'User 01'
            : 'User ' + (item.user_id ? item.user_id.slice(-4) : '')),
        user_email: userMap[item.user_id]?.email || '',
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
