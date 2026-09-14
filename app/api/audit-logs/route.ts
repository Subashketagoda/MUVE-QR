import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_AUDIT_LOGS } from '@/lib/demo-store'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return NextResponse.json({ success: true, auditLogs: data })
    }

    return NextResponse.json({ success: true, auditLogs: INITIAL_AUDIT_LOGS })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
