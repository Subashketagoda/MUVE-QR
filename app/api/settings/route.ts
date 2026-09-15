import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_SETTINGS, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any).from('settings').select('*')
      if (error) throw error

      const settingsObj: Record<string, string> = {}
      ;(data || []).forEach((item: any) => {
        settingsObj[item.key] = item.value || ''
      })
      return NextResponse.json({ success: true, settings: settingsObj })
    }

    return NextResponse.json({ success: true, settings: INITIAL_SETTINGS })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      for (const [key, value] of Object.entries(body)) {
        await (supabaseAdmin as any)
          .from('settings')
          .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }

      try {
        await (supabaseAdmin as any).from('audit_logs').insert({
          admin_id: '00000000-0000-0000-0000-000000000001',
          admin_name: 'System Admin',
          action: 'settings_changed',
          target_type: 'setting',
          target_name: 'Organization Settings',
          details: body,
        })
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Settings updated' })
    }

    Object.assign(INITIAL_SETTINGS, body)
    INITIAL_AUDIT_LOGS.unshift({
      id: `audit_${nanoid(8)}`,
      admin_id: 'usr_admin_001',
      admin_name: 'System Admin',
      action: 'settings_changed',
      target_type: 'setting',
      target_id: 'settings_01',
      target_name: 'Organization Settings',
      details: body,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, settings: INITIAL_SETTINGS })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
