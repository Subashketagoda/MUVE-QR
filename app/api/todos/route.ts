import { NextRequest, NextResponse } from 'next/server'
import { TodoRow } from '@/types/database'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushToAllStaff } from '@/lib/web-push-sender'
import {
  getAllTodosFromStore,
  addTodoToStore,
  updateTodoInStore,
  deleteTodoFromStore,
} from '@/lib/todos-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const adminReviewed = searchParams.get('adminReviewed')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')?.toLowerCase()

    let filtered = await getAllTodosFromStore()

    if (userId) {
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

    const saved = await addTodoToStore(newTodo)

    // 1. Dispatch push notification ONLY to targeted staff member (or all if user_id === 'all')
    try {
      await sendPushToAllStaff({
        title: `📋 New Task: ${title.trim()}`,
        body: description ? description.trim() : `New checklist task assigned by ${assigned_by || 'Admin'}`,
        url: '/app/tasks',
        tag: `muve-task-${saved.id}`,
        priority: priority || 'medium',
        targetUserId: newTodo.user_id,
      })
    } catch (pushErr) {
      console.warn('[Push] Error sending task push to staff:', pushErr)
    }

    // 2. Insert into global Supabase notifications table for instant Realtime & modal alerts
    try {
      const isSupabaseConfigured =
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
      if (isSupabaseConfigured) {
        await (supabaseAdmin as any).from('notifications').insert({
          type: 'alert',
          title: `📋 Task: ${title.trim()}`,
          message: description ? description.trim() : `Assigned by ${assigned_by || 'Admin'}`,
          is_read: false,
        })
      }
    } catch (e) {}

    return NextResponse.json({ success: true, todo: saved })
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

    const updatePayload: Partial<TodoRow> = {}

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

    const updated = await updateTodoInStore(id, updatePayload)

    return NextResponse.json({ success: true, todo: updated })
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

    await deleteTodoFromStore(id)
    return NextResponse.json({ success: true, message: 'Deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
