import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_NOTIFICATIONS } from '@/lib/demo-store'

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
