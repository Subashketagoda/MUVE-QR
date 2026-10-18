import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_NOTIFICATIONS } from '@/lib/demo-store'
import { sendPushToAllStaff } from '@/lib/web-push-sender'
import { addTodoToStore } from '@/lib/todos-store'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any)
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return NextResponse.json({ success: true, notifications: data })
    }

    return NextResponse.json({ success: true, notifications: INITIAL_NOTIFICATIONS })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, is_read } = body

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      if (id === 'all') {
        await (supabaseAdmin as any).from('notifications').update({ is_read: true }).eq('is_read', false)
      } else {
        await (supabaseAdmin as any).from('notifications').update({ is_read }).eq('id', id)
      }
      return NextResponse.json({ success: true })
    }

    if (id === 'all') {
      INITIAL_NOTIFICATIONS.forEach((n) => (n.is_read = true))
    } else {
      const target = INITIAL_NOTIFICATIONS.find((n) => n.id === id)
      if (target) target.is_read = is_read
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, message, type = 'scan', scan_id } = body

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      )
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let createdNotification: any = null

    if (isSupabaseConfigured) {
      const isUUID = (val: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '')

      const { data, error } = await (supabaseAdmin as any)
        .from('notifications')
        .insert({
          type,
          title,
          message,
          scan_id: scan_id && isUUID(scan_id) ? scan_id : null,
          is_read: false,
        })
        .select()
        .single()

      if (!error && data) {
        createdNotification = data
      }
    }

    if (!createdNotification) {
      createdNotification = {
        id: `notif_${Date.now()}`,
        type: type as any,
        title,
        message,
        scan_id: scan_id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      INITIAL_NOTIFICATIONS.unshift(createdNotification)
    }

    // If this is an actionable notification (not routine background scan), send to mobile phones & todolist
    if (type !== 'scan') {
      // 1. Dispatch Web Push to all staff phones (lock screen + audio)
      try {
        await sendPushToAllStaff({
          title,
          body: message,
          url: '/app/tasks',
          tag: `muve-notif-${createdNotification.id}`,
          category: type.toUpperCase(),
          priority: type === 'alert' ? 'high' : 'medium',
        })
      } catch (pushErr) {
        console.warn('[Push] Error broadcasting notification to phones:', pushErr)
      }

      // 2. Add as a todo list item for all staff checklist
      try {
        await addTodoToStore({
          id: createdNotification.id,
          user_id: 'all',
          user_name: 'System Admin',
          user_phone: 'MUVE Notification',
          title,
          description: message,
          priority: type === 'alert' ? 'high' : 'medium',
          status: 'pending',
          assigned_by: 'System Admin Dispatch',
          admin_reviewed: false,
          admin_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: createdNotification.created_at || new Date().toISOString(),
          updated_at: createdNotification.created_at || new Date().toISOString(),
        })
      } catch (storeErr) {
        console.warn('[TodosStore] Error saving notification to todos:', storeErr)
      }
    }

    return NextResponse.json({ success: true, notification: createdNotification })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

