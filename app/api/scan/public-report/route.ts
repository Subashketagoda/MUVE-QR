import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_TODOS, INITIAL_NOTIFICATIONS, INITIAL_QR_CODES } from '@/lib/demo-store'
import backupQRCodes from '@/lib/initial-qr-codes.json'
import { TodoRow, NotificationRow, QRCodeRow } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      qrToken,
      category = 'maintenance',
      reporterName = 'Visitor',
      reporterContact = '',
      priority = 'medium',
      description = '',
      deviceInfo = '',
    } = body

    if (!qrToken) {
      return NextResponse.json({ success: false, message: 'QR token is required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    // Find QR checkpoint
    let checkpoint: QRCodeRow | null = null
    if (isSupabaseConfigured) {
      const { data } = await (supabaseAdmin as any)
        .from('qr_codes')
        .select('*')
        .eq('token', qrToken.trim())
        .maybeSingle()
      if (data) checkpoint = data
    }

    if (!checkpoint) {
      const allQrs = [...(backupQRCodes as QRCodeRow[]), ...INITIAL_QR_CODES]
      checkpoint = allQrs.find((q) => q.token === qrToken.trim() || q.id === qrToken.trim()) || null
    }

    const locationName = checkpoint?.location_name || checkpoint?.name || 'Verified Checkpoint'
    const cleanCategory = (category || 'maintenance').toUpperCase()
    const ticketId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`
    const nowIso = new Date().toISOString()

    const title = `[${cleanCategory}] ${locationName}`
    const detailedDesc = [
      `Ticket: ${ticketId}`,
      `Category: ${cleanCategory}`,
      `Location: ${locationName}`,
      `Reporter: ${reporterName || 'Visitor'} ${reporterContact ? `(${reporterContact})` : ''}`,
      `Details: ${description || 'No additional details provided'}`,
      deviceInfo ? `Device: ${deviceInfo}` : null,
      `Submitted: ${new Date().toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n')

    // 1. Create Task / Todo entry for Admin & Staff
    const newTodo: TodoRow = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: 'all', // Broadcast to all guards and admins
      user_name: reporterName || 'Public Visitor',
      user_phone: reporterContact || 'Public Scan',
      title: title,
      description: detailedDesc,
      priority: priority as any,
      status: 'pending',
      assigned_by: `Public Checkpoint Scan (${locationName})`,
      admin_reviewed: false,
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    // 2. Create Notification entry
    const newNotif: NotificationRow = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'alert',
      title: `🚨 Public Report: ${cleanCategory} at ${locationName}`,
      message: `${reporterName || 'Visitor'} reported: ${description || cleanCategory} (${priority.toUpperCase()})`,
      scan_id: null,
      is_read: false,
      created_at: nowIso,
    }

    if (isSupabaseConfigured) {
      try {
        await (supabaseAdmin as any).from('todos').insert(newTodo)
      } catch (e) {
        console.warn('Could not insert into Supabase todos table, storing in-memory:', e)
      }

      try {
        await (supabaseAdmin as any).from('notifications').insert(newNotif)
      } catch (e) {
        console.warn('Could not insert notification into Supabase:', e)
      }
    }

    // Always store in memory demo store as well
    INITIAL_TODOS.unshift(newTodo)
    INITIAL_NOTIFICATIONS.unshift(newNotif)

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Report submitted successfully. Facility and security staff have been alerted.',
      checkpoint: {
        location_name: locationName,
        token: qrToken,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
