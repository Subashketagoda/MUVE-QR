import { TodoRow } from '@/types/database'
import { INITIAL_TODOS } from '@/lib/demo-store'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qokfbbcwykbdruvqwnhr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_g3D5qPwtftS5rdjYSfeDmg_MoxMSr-0'

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// 1. Fetch all todos from Supabase settings (key: 'todos_store') merged with Supabase notifications
export async function getAllTodosFromStore(): Promise<TodoRow[]> {
  let storedTodos: TodoRow[] = []

  // Step A: Load persisted todos from Supabase settings table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.todos_store&select=*`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.value) {
      const parsed = JSON.parse(data[0].value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedTodos = parsed
      }
    }
  } catch (e) {
    console.warn('[TodosStore] Error reading todos from Supabase settings:', e)
  }

  // If store was completely empty, seed with INITIAL_TODOS
  if (storedTodos.length === 0) {
    storedTodos = [...INITIAL_TODOS]
  }

  // Step B: Fetch all notifications (alerts, reports, admin dispatches) from Supabase notifications table
  try {
    const resNotif = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?type=neq.scan&select=*&order=created_at.desc&limit=60`,
      {
        headers: HEADERS,
        cache: 'no-store',
      }
    )
    const alerts = await resNotif.json()

    if (Array.isArray(alerts)) {
      for (const a of alerts) {
        const existingIdx = storedTodos.findIndex(
          (t) => t.id === a.id || t.title === a.title
        )

        if (existingIdx >= 0) {
          // If stored todo exists, ensure ID is mapped to notification ID if it wasn't
          if (storedTodos[existingIdx].id !== a.id) {
            storedTodos[existingIdx].id = a.id
          }
        } else {
          // Add notification to todos list
          const isReport = a.title?.includes('Report') || a.title?.includes('🚨')
          storedTodos.unshift({
            id: a.id,
            user_id: 'all',
            user_name: isReport ? 'Public Visitor' : 'Admin Dispatch',
            user_phone: isReport ? 'Public Checkpoint Scan' : 'System Notification',
            title: a.title,
            description: a.message,
            priority: a.title?.includes('URGENT') || a.message?.includes('URGENT') ? 'urgent' : 'high',
            status: a.is_read ? 'completed' : 'pending',
            assigned_by: isReport ? 'Public Checkpoint Scan' : 'System Admin',
            admin_reviewed: !!a.is_read,
            admin_notes: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: a.created_at,
            updated_at: a.created_at,
          })
        }
      }
    }
  } catch (e) {
    console.warn('[TodosStore] Error syncing with Supabase notifications:', e)
  }

  // Sort descending by created_at
  storedTodos.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return storedTodos
}

// 2. Save entire todos array to Supabase settings table
async function persistTodosArray(todos: TodoRow[]): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.todos_store`, {
      method: 'PATCH',
      headers: {
        ...HEADERS,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        value: JSON.stringify(todos),
        updated_at: new Date().toISOString(),
      }),
    })
    return res.ok
  } catch (e) {
    console.warn('[TodosStore] Error persisting todos array to Supabase:', e)
    return false
  }
}

// 3. Add a new todo
export async function addTodoToStore(newTodo: TodoRow): Promise<TodoRow> {
  const current = await getAllTodosFromStore()
  // Add to beginning
  current.unshift(newTodo)
  await persistTodosArray(current)

  // Keep in-memory store in sync
  const existingIdx = INITIAL_TODOS.findIndex((t) => t.id === newTodo.id)
  if (existingIdx === -1) {
    INITIAL_TODOS.unshift(newTodo)
  }

  return newTodo
}

// 4. Update an existing todo (including marking complete / pending)
export async function updateTodoInStore(
  id: string,
  updates: Partial<TodoRow>
): Promise<TodoRow | null> {
  const current = await getAllTodosFromStore()
  let targetIdx = current.findIndex((t) => t.id === id)

  // If not found by exact id, try matching title if provided
  if (targetIdx === -1 && updates.title) {
    targetIdx = current.findIndex((t) => t.title === updates.title)
  }

  if (targetIdx === -1) {
    console.warn(`[TodosStore] Todo with ID ${id} not found to update.`)
    return null
  }

  const updatedTodo: TodoRow = {
    ...current[targetIdx],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  current[targetIdx] = updatedTodo
  await persistTodosArray(current)

  // Sync with notifications table in Supabase if this todo corresponds to an alert
  if (updates.status !== undefined) {
    try {
      const isRead = updates.status === 'completed'
      await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ is_read: isRead }),
      })
    } catch (e) {
      console.warn('[TodosStore] Error syncing is_read to notifications:', e)
    }
  }

  // Update in-memory fallback
  const memIdx = INITIAL_TODOS.findIndex((t) => t.id === id)
  if (memIdx >= 0) {
    INITIAL_TODOS[memIdx] = updatedTodo
  }

  return updatedTodo
}

// 5. Delete a todo
export async function deleteTodoFromStore(id: string): Promise<boolean> {
  const current = await getAllTodosFromStore()
  const filtered = current.filter((t) => t.id !== id)
  await persistTodosArray(filtered)

  // Also remove from in-memory
  const memIdx = INITIAL_TODOS.findIndex((t) => t.id === id)
  if (memIdx >= 0) {
    INITIAL_TODOS.splice(memIdx, 1)
  }

  return true
}
