import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { INITIAL_USERS, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 401 })
      }

      const { data: profile } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile?.role || 'user',
          full_name: profile?.full_name || data.user.email,
        },
      })
    }

    const demoUser = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!demoUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. User not found in demo environment.' },
        { status: 401 }
      )
    }

    if (demoUser.status !== 'active') {
      return NextResponse.json(
        { success: false, message: `Account is ${demoUser.status}. Contact administrator.` },
        { status: 403 }
      )
    }

    if (demoUser.role === 'admin') {
      INITIAL_AUDIT_LOGS.unshift({
        id: `audit_${nanoid(8)}`,
        admin_id: demoUser.id,
        admin_name: demoUser.full_name,
        action: 'admin_login',
        target_type: 'auth',
        target_id: demoUser.id,
        target_name: demoUser.full_name,
        details: { email: demoUser.email },
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        full_name: demoUser.full_name,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
