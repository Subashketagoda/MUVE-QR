import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SCANS, INITIAL_USERS } from '@/lib/demo-store'

function getTzDateRange(dateStr: string, isEnd: boolean, timeZone: string): string {
  if (dateStr.includes('T')) return dateStr
  const timePart = isEnd ? '23:59:59.999' : '00:00:00.000'
  try {
    let offset = '+05:30'
    if (timeZone === 'UTC') {
      offset = 'Z'
    } else {
      const testDate = new Date(`${dateStr}T12:00:00Z`)
      const dtf = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      const parts = dtf.formatToParts(testDate)
      const tzPart = parts.find((p) => p.type === 'timeZoneName')
      if (tzPart && tzPart.value.startsWith('GMT')) {
        offset = tzPart.value.replace('GMT', '')
        if (offset === '') offset = 'Z'
      }
    }
    const d = new Date(`${dateStr}T${timePart}${offset}`)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch (e) {}
  return `${dateStr}T${timePart}Z`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const qrId = searchParams.get('qrId')
    const status = searchParams.get('status')
    let tz = searchParams.get('timezone') || ''

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (!tz && isSupabaseConfigured) {
      try {
        const { data: tzSetting } = await (supabaseAdmin as any)
          .from('settings')
          .select('value')
          .eq('key', 'timezone')
          .maybeSingle()
        if (tzSetting?.value && tzSetting.value !== 'UTC') {
          tz = tzSetting.value
        }
      } catch (e) {}
    }
    if (!tz || tz === 'UTC') tz = 'Asia/Colombo'

    if (isSupabaseConfigured) {
      let query = supabaseAdmin
        .from('scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })

      if (startDate) {
        const start = getTzDateRange(startDate, false, tz)
        query = query.gte('scanned_at', start)
      }
      if (endDate) {
        const end = getTzDateRange(endDate, true, tz)
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

      const reportData = (data || []).map((row: any) => {
        const d = new Date(row.scanned_at)
        const dateStr = !isNaN(d.getTime())
          ? d.toLocaleDateString('en-GB', { timeZone: tz })
          : row.scanned_at
        const time12 = !isNaN(d.getTime())
          ? d.toLocaleTimeString('en-US', {
              timeZone: tz,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : ''
        const time24 = !isNaN(d.getTime())
          ? d.toLocaleTimeString('en-GB', {
              timeZone: tz,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
          : ''

        return {
          id: row.id,
          date: dateStr,
          time: time12,
          time_12: time12,
          time_24: time24,
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
        }
      })

      return NextResponse.json({ success: true, report: reportData, timezone: tz })
    }

    // Demo store fallback
    let filtered = [...INITIAL_SCANS]
    if (startDate) {
      const start = new Date(getTzDateRange(startDate, false, tz))
      filtered = filtered.filter((s) => new Date(s.scanned_at) >= start)
    }
    if (endDate) {
      const end = new Date(getTzDateRange(endDate, true, tz))
      filtered = filtered.filter((s) => new Date(s.scanned_at) <= end)
    }
    if (userId) filtered = filtered.filter((s) => s.user_id === userId)
    if (qrId) filtered = filtered.filter((s) => s.qr_id === qrId)
    if (status) filtered = filtered.filter((s) => s.status === status)

    const reportData = filtered.map((row) => {
      const u = INITIAL_USERS.find((user) => user.id === row.user_id)
      const d = new Date(row.scanned_at)
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-GB', { timeZone: tz })
        : row.scanned_at
      const time12 = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : ''
      const time24 = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : ''

      return {
        id: row.id,
        date: dateStr,
        time: time12,
        time_12: time12,
        time_24: time24,
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

    return NextResponse.json({ success: true, report: reportData, timezone: tz })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
