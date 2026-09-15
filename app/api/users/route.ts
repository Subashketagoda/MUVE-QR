import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_USERS, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { UserRow } from '@/types/database'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any)
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, users: data })
    }

    return NextResponse.json({ success: true, users: INITIAL_USERS })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { full_name, email, phone, role = 'user', status = 'active', password } = body

    const userPhone = (phone || '').trim()
    const userEmail = (email || (userPhone ? `${userPhone.replace(/[^0-9]/g, '')}@muveqr.app` : '')).trim()

    if (!full_name || (!userPhone && !email)) {
      return NextResponse.json(
        { success: false, message: 'Full Name and Phone Number are required' },
        { status: 400 }
      )
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: password || 'User@123456',
        email_confirm: true,
        user_metadata: { full_name, role },
      })

      if (authErr) throw authErr

      const { data, error } = await (supabaseAdmin as any)
        .from('users')
        .update({
          full_name,
          phone: phone || null,
          role,
          status,
        })
        .eq('id', authUser.user.id)
        .select()
        .single()

      if (error) throw error

      await (supabaseAdmin as any).from('audit_logs').insert({
        admin_name: 'System Admin',
        action: 'user_created',
        target_type: 'user',
        target_id: data.id,
        target_name: full_name,
        details: { email, role, status },
      })

      return NextResponse.json({ success: true, user: data })
    }

    const now = new Date().toISOString()
    const newUser: UserRow = {
      id: `usr_${nanoid(10)}`,
      full_name,
      email: userEmail,
      phone: userPhone || null,
      role: role as 'admin' | 'user',
      status: status as 'active' | 'inactive' | 'suspended',
      avatar_url: null,
      created_at: now,
      updated_at: now,
    }

    INITIAL_USERS.unshift(newUser)
    INITIAL_AUDIT_LOGS.unshift({
      id: `audit_${nanoid(8)}`,
      admin_id: 'usr_admin_001',
      admin_name: 'System Admin',
      action: 'user_created',
      target_type: 'user',
      target_id: newUser.id,
      target_name: full_name,
      details: { email, role, status },
      ip_address: '127.0.0.1',
      created_at: now,
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
