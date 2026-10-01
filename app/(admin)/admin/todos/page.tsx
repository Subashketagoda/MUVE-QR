'use client'

import React, { useEffect, useState } from 'react'
import {
  CheckSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ShieldCheck,
  MessageSquare,
  User,
  Calendar,
  X,
  Plus,
  Check,
  ArrowUpDown,
  Sparkles,
  Phone,
  Eye,
} from 'lucide-react'
import { TodoRow, TodoPriority, TodoStatus } from '@/types/database'
import { toast } from 'sonner'

export default function AdminTodosPage() {
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Note Modal State
  const [activeTodoForNote, setActiveTodoForNote] = useState<TodoRow | null>(null)
  const [adminNoteText, setAdminNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Details Modal
  const [selectedTodo, setSelectedTodo] = useState<TodoRow | null>(null)

  // User list for task assignment
  const [usersList, setUsersList] = useState<any[]>([])

  // Assign Task Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState('all')
  const [assignTitle, setAssignTitle] = useState('')
  const [assignDesc, setAssignDesc] = useState('')
  const [assignPriority, setAssignPriority] = useState<TodoPriority>('medium')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    fetchTodos()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (json.success && Array.isArray(json.users)) {
        setUsersList(json.users.filter((u: any) => u.role === 'user'))
      }
    } catch (e) {}
  }

  const fetchTodos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/todos?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.todos)) {
        setTodos(data.todos)
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load user tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTitle.trim()) {
      toast.error('Please enter a task title')
      return
    }

    setAssigning(true)
    let targetName = 'All Users'
    let targetPhone = ''

    if (assignUserId !== 'all') {
      const found = usersList.find((u) => u.id === assignUserId)
      if (found) {
        targetName = found.full_name
        targetPhone = found.phone || ''
      }
    }

    const payload = {
      user_id: assignUserId,
      user_name: targetName,
      user_phone: targetPhone,
      title: assignTitle.trim(),
      description: assignDesc.trim() || null,
      priority: assignPriority,
      assigned_by: 'System Admin',
    }

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          assignUserId === 'all'
            ? 'Task broadcasted to all mobile users!'
            : `Task assigned to ${targetName}!`
        )
        setAssignTitle('')
        setAssignDesc('')
        setAssignPriority('medium')
        setAssignUserId('all')
        setIsAssignModalOpen(false)
        fetchTodos()
      } else {
        toast.error(data.message || 'Failed to assign task')
      }
    } catch (e) {
      toast.error('Network error assigning task')
    } finally {
      setAssigning(false)
    }
  }

  const handleToggleAdminReview = async (todo: TodoRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nextReviewed = !todo.admin_reviewed
    const updated = todos.map((t) =>
      t.id === todo.id
        ? {
            ...t,
            admin_reviewed: nextReviewed,
            reviewed_by: nextReviewed ? 'System Admin' : null,
            reviewed_at: nextReviewed ? new Date().toISOString() : null,
          }
        : t
    )
    setTodos(updated)

    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          admin_reviewed: nextReviewed,
          reviewed_by: nextReviewed ? 'System Admin' : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (nextReviewed) {
          toast.success(`Task "${todo.title}" verified & checked!`)
        } else {
          toast.info(`Task "${todo.title}" marked as unverified`)
        }
      }
    } catch (e) {
      toast.error('Network error updating task')
      fetchTodos()
    }
  }

  const handleSaveAdminNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTodoForNote) return

    setSavingNote(true)
    const note = adminNoteText.trim()
    const updated = todos.map((t) =>
      t.id === activeTodoForNote.id
        ? {
            ...t,
            admin_notes: note || null,
            admin_reviewed: true,
            reviewed_by: 'System Admin',
            reviewed_at: new Date().toISOString(),
          }
        : t
    )
    setTodos(updated)

    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTodoForNote.id,
          admin_notes: note || null,
          admin_reviewed: true,
          reviewed_by: 'System Admin',
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Admin note saved & task verified!')
      }
    } catch (e) {
      toast.error('Failed to save note')
    } finally {
      setSavingNote(false)
      setActiveTodoForNote(null)
      setAdminNoteText('')
    }
  }

  const handleDelete = async (todo: TodoRow, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete task "${todo.title}"?`)) return

    const updated = todos.filter((t) => t.id !== todo.id)
    setTodos(updated)

    try {
      await fetch(`/api/todos?id=${todo.id}`, { method: 'DELETE' })
      toast.success('Task removed')
    } catch (e) {
      toast.error('Failed to delete task')
      fetchTodos()
    }
  }

  // Unique users for dropdown filter
  const uniqueUsers = Array.from(
    new Set(todos.map((t) => t.user_name).filter(Boolean))
  )

  // Filtered todos
  const filteredTodos = todos.filter((t) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchDesc = t.description?.toLowerCase().includes(q)
      const matchUser = t.user_name.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc && !matchUser) return false
    }

    // User filter
    if (userFilter !== 'all' && t.user_name !== userFilter) return false

    // Status filter
    if (statusFilter !== 'all' && t.status !== statusFilter) return false

    // Review filter
    if (reviewFilter === 'pending' && t.admin_reviewed) return false
    if (reviewFilter === 'reviewed' && !t.admin_reviewed) return false

    // Priority filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

    return true
  })

  // Metrics
  const totalCount = todos.length
  const pendingReviewCount = todos.filter((t) => !t.admin_reviewed).length
  const completedCount = todos.filter((t) => t.status === 'completed').length
  const reviewedCount = todos.filter((t) => t.admin_reviewed).length

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">User Tasks & Checklist</h1>
            <span className="px-2.5 py-0.5 text-xs font-extrabold bg-[#D4FC04] text-black rounded-full">
              Live Review
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Review, check off, and verify checklists and inspection tasks submitted by mobile users
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Assign New Task</span>
          </button>
          <button
            onClick={fetchTodos}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5">Across all mobile users</span>
        </div>

        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-amber-500 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Needs Admin Check</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{pendingReviewCount}</p>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5">
            Pending verification
          </span>
        </div>

        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Completed by User</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{completedCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Marked done by personnel
          </span>
        </div>

        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Verified by Admin</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{reviewedCount}</p>
          <span className="text-[11px] text-indigo-600 font-medium mt-0.5">
            Checked & confirmed
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by task title, description, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm w-full"
            />
          </div>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="input text-sm md:w-44 font-medium"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm md:w-36 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Admin Review Filter */}
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="input text-sm md:w-44 font-medium"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Needs Admin Check</option>
            <option value="reviewed">Verified by Admin</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input text-sm md:w-36 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks Table / Card List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">No tasks match your criteria</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              When users log checklist items or inspection notes from their mobile app, they will appear
              here for administrative verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Task & Notes</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">User Status</th>
                  <th className="py-3 px-4">Admin Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredTodos.map((todo) => {
                  const isDone = todo.status === 'completed'
                  const isReviewed = todo.admin_reviewed

                  const priorityStyles: Record<string, string> = {
                    urgent: 'bg-rose-100 text-rose-800 border-rose-200',
                    high: 'bg-amber-100 text-amber-800 border-amber-200',
                    medium: 'bg-blue-100 text-blue-800 border-blue-200',
                    low: 'bg-slate-100 text-slate-700 border-slate-200',
                  }

                  return (
                    <tr
                      key={todo.id}
                      onClick={() => setSelectedTodo(todo)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isReviewed ? 'bg-white' : 'bg-amber-50/10'
                      }`}
                    >
                      {/* Submitter */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {todo.user_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{todo.user_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {todo.user_phone || 'User Mobile'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Task Info */}
                      <td className="py-4 px-4 max-w-md">
                        <div>
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-bold text-slate-900 ${
                                isDone ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {todo.title}
                            </p>
                            {todo.assigned_by && (
                              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/80">
                                Assigned by Admin
                              </span>
                            )}
                          </div>
                          {todo.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {todo.description}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Logged: {new Date(todo.created_at).toLocaleString()}
                          </p>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            priorityStyles[todo.priority] || priorityStyles.medium
                          }`}
                        >
                          {todo.priority}
                        </span>
                      </td>

                      {/* User Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Admin Verification */}
                      <td className="py-4 px-4">
                        {isReviewed ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Checked & Verified
                            </span>
                            {todo.reviewed_at && (
                              <p className="text-[10px] text-slate-400">
                                By {todo.reviewed_by || 'Admin'} •{' '}
                                {new Date(todo.reviewed_at).toLocaleDateString()}
                              </p>
                            )}
                            {todo.admin_notes && (
                              <div className="text-[11px] text-slate-600 bg-slate-100/80 px-2 py-1 rounded border border-slate-200 mt-1 flex items-start gap-1">
                                <MessageSquare className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1 italic">{todo.admin_notes}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Awaiting Check
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Check / Uncheck Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleAdminReview(todo, e)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                              isReviewed
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                            title={isReviewed ? 'Uncheck task' : 'Mark as checked & approved'}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isReviewed ? 'Uncheck' : 'Check & Verify'}</span>
                          </button>

                          {/* Admin Note Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveTodoForNote(todo)
                              setAdminNoteText(todo.admin_notes || '')
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Add/edit admin note"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(todo, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Note Modal */}
      {activeTodoForNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Verify Task & Attach Note</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[260px]">
                    {activeTodoForNote.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTodoForNote(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminNote} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Feedback / Verification Note
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g., Checked security checkpoint camera footage. Everything confirmed in order."
                  value={adminNoteText}
                  onChange={(e) => setAdminNoteText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Saving this will automatically mark the task as <strong>Checked & Verified</strong>{' '}
                  for the mobile user.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTodoForNote(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{savingNote ? 'Saving...' : 'Verify & Save Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Task Details Drawer/Modal */}
      {selectedTodo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Task Details</h3>
              </div>
              <button
                onClick={() => setSelectedTodo(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Task Title
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedTodo.title}</h2>
              </div>

              {selectedTodo.description && (
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Description & Observations
                  </span>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedTodo.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Submitter</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedTodo.user_name}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedTodo.user_phone}</p>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Priority</span>
                  <p className="font-bold text-slate-900 text-sm capitalize mt-0.5">
                    {selectedTodo.priority}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {selectedTodo.status === 'completed' ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Admin Verification Status
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedTodo.admin_reviewed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {selectedTodo.admin_reviewed ? 'Verified' : 'Pending Check'}
                  </span>
                </div>

                {selectedTodo.admin_notes && (
                  <p className="text-xs text-emerald-950 font-medium">
                    &quot;{selectedTodo.admin_notes}&quot;
                  </p>
                )}
                {selectedTodo.reviewed_at && (
                  <p className="text-[10px] text-emerald-700">
                    Reviewed by {selectedTodo.reviewed_by} on{' '}
                    {new Date(selectedTodo.reviewed_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleAdminReview(selectedTodo)
                    setSelectedTodo((prev) =>
                      prev
                        ? {
                            ...prev,
                            admin_reviewed: !prev.admin_reviewed,
                            reviewed_by: !prev.admin_reviewed ? 'System Admin' : null,
                          }
                        : null
                    )
                  }}
                  className={`btn btn-sm ${
                    selectedTodo.admin_reviewed ? 'btn-secondary' : 'btn-primary'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  {selectedTodo.admin_reviewed ? 'Revoke Check' : 'Mark as Checked & Verified'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTodo(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Assign Task to User Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Assign Task to User</h3>
                  <p className="text-xs text-slate-500">
                    This task will immediately appear on the user&apos;s mobile app
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="p-6 space-y-4">
              {/* Select Target User */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assign To *
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">📢 All Mobile Users (Broadcast)</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {u.full_name} ({u.phone || u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose a specific personnel or broadcast to all patrol officers.
                </p>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect Sector 4 Fire Exit & Scan QR"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Instructions & Checklist Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verify QR code sticker condition, ensure perimeter gate padlock is locked, check emergency lighting..."
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as TodoPriority[]).map((p) => {
                    const isSelected = assignPriority === p
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setAssignPriority(p)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition border ${
                          isSelected
                            ? p === 'urgent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : p === 'high'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{assigning ? 'Assigning...' : 'Assign Task Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
