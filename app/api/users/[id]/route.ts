import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_USERS, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { nanoid } from 'nanoid'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { full_name, email, phone, role, status, password } = body

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    const updatePayload: any = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updatePayload.full_name = full_name
    if (email !== undefined) updatePayload.email = email
    if (phone !== undefined) updatePayload.phone = phone
    if (role !== undefined) updatePayload.role = role
    if (status !== undefined) updatePayload.status = status

    const isUUID = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '')

    let targetId = id
    if (targetId === 'usr_admin_001') targetId = '00000000-0000-0000-0000-000000000001'
    if (targetId === 'usr_user_001') targetId = '00000000-0000-0000-0000-000000000002'

    if (isSupabaseConfigured) {
      if (!isUUID(targetId)) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
      }

      if (password) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetId, { password })
        } catch (authErr) {}
      }

      const { data, error } = await (supabaseAdmin as any)
        .from('users')
        .update(updatePayload)
        .eq('id', targetId)
        .select()
        .single()

      if (error) throw error

      try {
        await (supabaseAdmin as any).from('audit_logs').insert({
          admin_id: '00000000-0000-0000-0000-000000000001',
          admin_name: 'System Admin',
          action: status ? `user_${status}` : 'user_edited',
          target_type: 'user',
          target_id: targetId,
          target_name: data.full_name,
          details: updatePayload,
        })
      } catch (e) {}

      return NextResponse.json({ success: true, user: data })
    }

    // Demo store
    const idx = INITIAL_USERS.findIndex((u) => u.id === id)
    if (idx === -1) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    INITIAL_USERS[idx] = { ...INITIAL_USERS[idx], ...updatePayload }
    const updated = INITIAL_USERS[idx]

    INITIAL_AUDIT_LOGS.unshift({
      id: `audit_${nanoid(8)}`,
      admin_id: 'usr_admin_001',
      admin_name: 'System Admin',
      action: status ? `user_${status}` : 'user_edited',
      target_type: 'user',
      target_id: id,
      target_name: updated.full_name,
      details: updatePayload,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    const isUUID = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '')

    let targetId = id
    if (targetId === 'usr_admin_001') targetId = '00000000-0000-0000-0000-000000000001'
    if (targetId === 'usr_user_001') targetId = '00000000-0000-0000-0000-000000000002'

    if (isSupabaseConfigured) {
      if (!isUUID(targetId)) {
        return NextResponse.json({ success: true, message: 'User deleted' })
      }
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetId)
      } catch (e) {}
      await (supabaseAdmin as any).from('users').delete().eq('id', targetId)
      return NextResponse.json({ success: true, message: 'User deleted' })
    }

    const idx = INITIAL_USERS.findIndex((u) => u.id === id)
    if (idx !== -1) {
      INITIAL_USERS.splice(idx, 1)
    }
    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
