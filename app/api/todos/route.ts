import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_TODOS, INITIAL_USERS } from '@/lib/demo-store'
import { TodoRow } from '@/types/database'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const adminReviewed = searchParams.get('adminReviewed')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')?.toLowerCase()

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      try {
        let query = (supabaseAdmin as any)
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false })

        if (userId) {
          query = query.or(`user_id.eq.${userId},user_id.eq.all`)
        }
        if (status) query = query.eq('status', status)
        if (adminReviewed !== null && adminReviewed !== undefined && adminReviewed !== '') {
          query = query.eq('admin_reviewed', adminReviewed === 'true')
        }
        if (priority) query = query.eq('priority', priority)
        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,user_name.ilike.%${search}%`)
        }

        const { data, error } = await query
        if (!error && data) {
          return NextResponse.json({ success: true, todos: data })
        }
      } catch (err) {
        console.warn('Supabase todos query failed, falling back to in-memory store:', err)
      }
    }

    // Fallback to in-memory store
    let filtered = [...INITIAL_TODOS]

    if (userId) {
      // Normalize comparison for demo user IDs and broadcast 'all'
      filtered = filtered.filter(
        (t) =>
          t.user_id === 'all' ||
          t.user_id === userId ||
          ((userId === 'usr_user_001' || userId === '00000000-0000-0000-0000-000000000002') &&
            (t.user_id === 'usr_user_001' || t.user_id === '00000000-0000-0000-0000-000000000002'))
      )
    }

    if (status) {
      filtered = filtered.filter((t) => t.status === status)
    }

    if (adminReviewed !== null && adminReviewed !== undefined && adminReviewed !== '') {
      const isRev = adminReviewed === 'true'
      filtered = filtered.filter((t) => t.admin_reviewed === isRev)
    }

    if (priority) {
      filtered = filtered.filter((t) => t.priority === priority)
    }

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)) ||
          t.user_name.toLowerCase().includes(search)
      )
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ success: true, todos: filtered })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, user_name, user_phone, title, description, priority, assigned_by } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 })
    }

    const newTodo: TodoRow = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user_id || '00000000-0000-0000-0000-000000000002',
      user_name: user_name || 'User 01',
      user_phone: user_phone || '077 111 1111',
      title: title.trim(),
      description: description ? description.trim() : null,
      priority: priority || 'medium',
      status: 'pending',
      assigned_by: assigned_by || 'System Admin',
      admin_reviewed: false,
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabaseAdmin as any)
          .from('todos')
          .insert(newTodo)
          .select()
          .single()

        if (!error && data) {
          return NextResponse.json({ success: true, todo: data })
        }
      } catch (e) {
        console.warn('Supabase insert failed, storing in memory:', e)
      }
    }

    // Always keep in-memory sync
    INITIAL_TODOS.unshift(newTodo)
    return NextResponse.json({ success: true, todo: newTodo })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      status,
      title,
      description,
      priority,
      admin_reviewed,
      admin_notes,
      reviewed_by,
    } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'Todo ID is required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) updatePayload.status = status
    if (title !== undefined) updatePayload.title = title
    if (description !== undefined) updatePayload.description = description
    if (priority !== undefined) updatePayload.priority = priority
    if (admin_reviewed !== undefined) {
      updatePayload.admin_reviewed = admin_reviewed
      if (admin_reviewed) {
        updatePayload.reviewed_by = reviewed_by || 'System Admin'
        updatePayload.reviewed_at = new Date().toISOString()
      } else {
        updatePayload.reviewed_by = null
        updatePayload.reviewed_at = null
      }
    }
    if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabaseAdmin as any)
          .from('todos')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single()

        if (!error && data) {
          return NextResponse.json({ success: true, todo: data })
        }
      } catch (e) {
        console.warn('Supabase update failed, updating in memory:', e)
      }
    }

    const index = INITIAL_TODOS.findIndex((t) => t.id === id)
    if (index !== -1) {
      INITIAL_TODOS[index] = {
        ...INITIAL_TODOS[index],
        ...updatePayload,
      }
      return NextResponse.json({ success: true, todo: INITIAL_TODOS[index] })
    }

    return NextResponse.json({ success: true, message: 'Updated locally' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Todo ID is required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      try {
        await (supabaseAdmin as any).from('todos').delete().eq('id', id)
      } catch (e) {
        console.warn('Supabase delete failed:', e)
      }
    }

    const index = INITIAL_TODOS.findIndex((t) => t.id === id)
    if (index !== -1) {
      INITIAL_TODOS.splice(index, 1)
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
