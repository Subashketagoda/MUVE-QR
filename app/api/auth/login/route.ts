import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_USERS, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { nanoid } from 'nanoid'

function cleanPhone(val: string): string {
  return (val || '').replace(/[\s\-\(\)\.]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawIdentifier = (body.phone || body.email || body.identifier || '').trim()
    const { password } = body

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const inputDigits = cleanPhone(rawIdentifier)
      const inputLower = rawIdentifier.toLowerCase()

      // 1. Direct Supabase database user check
      try {
        const { data: dbUsers } = await (supabaseAdmin as any)
          .from('users')
          .select('*')

        if (dbUsers && dbUsers.length > 0) {
          const found = dbUsers.find((u: any) => {
            const uDigits = cleanPhone(u.phone || '')
            const uEmail = (u.email || '').toLowerCase()
            return (
              (inputDigits && (uDigits === inputDigits || uDigits.endsWith(inputDigits) || inputDigits.endsWith(uDigits))) ||
              uEmail === inputLower
            )
          })

          if (found) {
            return NextResponse.json({
              success: true,
              user: {
                id: found.id,
                phone: found.phone || rawIdentifier,
                email: found.email,
                role: found.role || 'user',
                full_name: found.full_name || 'User',
              },
            })
          }
        }
      } catch (dbErr) {
        console.warn('DB user check error:', dbErr)
      }

      // 2. Supabase Auth signInWithPassword
      const emailToUse = rawIdentifier.includes('@')
        ? rawIdentifier
        : `${cleanPhone(rawIdentifier)}@muveqr.app`

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      })

      if (!error && data?.user) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        return NextResponse.json({
          success: true,
          user: {
            id: data.user.id,
            phone: profile?.phone || rawIdentifier,
            email: data.user.email,
            role: profile?.role || 'user',
            full_name: profile?.full_name || 'User',
          },
        })
      }
    }

    // Match by phone number (with fallback to email if entered)
    const inputDigits = cleanPhone(rawIdentifier)
    const inputLower = rawIdentifier.toLowerCase()

    const demoUser = INITIAL_USERS.find((u) => {
      const uDigits = cleanPhone(u.phone || '')
      const uEmail = (u.email || '').toLowerCase()

      const phoneMatch =
        inputDigits &&
        uDigits &&
        (uDigits === inputDigits ||
          uDigits.endsWith(inputDigits) ||
          inputDigits.endsWith(uDigits))

      const emailMatch = uEmail === inputLower

      return phoneMatch || emailMatch
    })

    if (!demoUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number or password. User not found.' },
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
        details: { phone: demoUser.phone, email: demoUser.email },
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        phone: demoUser.phone,
        email: demoUser.email,
        role: demoUser.role,
        full_name: demoUser.full_name,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
