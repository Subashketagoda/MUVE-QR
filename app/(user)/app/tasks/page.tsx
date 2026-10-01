'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ShieldCheck,
  Trash2,
  MessageSquare,
  Sparkles,
  Calendar,
  X,
  Filter,
  Check,
} from 'lucide-react'
import { TodoRow, TodoPriority } from '@/types/database'
import { toast } from 'sonner'

export default function UserTasksPage() {
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'assigned' | 'pending' | 'completed' | 'reviewed'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // New Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<TodoPriority>('medium')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('muve_user')
    let currentUsr = {
      id: '00000000-0000-0000-0000-000000000002',
      full_name: 'User 01',
      phone: '077 111 1111',
      role: 'user',
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.id === 'usr_user_001') {
          parsed.id = '00000000-0000-0000-0000-000000000002'
        }
        currentUsr = parsed
      } catch (e) {}
    }
    setUser(currentUsr)
    fetchTodos(currentUsr.id)
  }, [])

  const fetchTodos = async (userId: string) => {
    setLoading(true)
    let localTodos: TodoRow[] = []
    try {
      localTodos = JSON.parse(localStorage.getItem('muve_local_todos') || '[]')
      if (localTodos.length > 0) {
        setTodos(localTodos)
      }
    } catch (e) {}

    try {
      const res = await fetch(`/api/todos?userId=${userId}&t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.todos)) {
        setTodos(data.todos)
        localStorage.setItem('muve_local_todos', JSON.stringify(data.todos))
      }
    } catch (e) {
      console.error('Error fetching todos:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) {
      toast.error('Please enter a task title')
      return
    }

    setSubmitting(true)
    const newId = `todo_${Date.now()}`
    const newTodo: TodoRow = {
      id: newId,
      user_id: user?.id || '00000000-0000-0000-0000-000000000002',
      user_name: user?.full_name || 'User 01',
      user_phone: user?.phone || '077 111 1111',
      title: taskTitle.trim(),
      description: taskDesc.trim() || null,
      priority: taskPriority,
      status: 'pending',
      admin_reviewed: false,
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Optimistic update
    const updated = [newTodo, ...todos]
    setTodos(updated)
    localStorage.setItem('muve_local_todos', JSON.stringify(updated))

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      })
      const data = await res.json()
      if (data.success && data.todo) {
        toast.success('Task created successfully!')
      } else {
        toast.success('Task saved to checklist')
      }
    } catch (e) {
      toast.success('Task saved locally')
    } finally {
      setSubmitting(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskPriority('medium')
      setIsModalOpen(false)
    }
  }

  const handleToggleStatus = async (todo: TodoRow) => {
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed'
    const updatedList = todos.map((t) =>
      t.id === todo.id ? { ...t, status: nextStatus, updated_at: new Date().toISOString() } : t
    )
    setTodos(updatedList)
    localStorage.setItem('muve_local_todos', JSON.stringify(updatedList))

    try {
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todo.id, status: nextStatus }),
      })
      if (nextStatus === 'completed') {
        toast.success('Marked as completed! Admin will review.')
      } else {
        toast.info('Marked as pending')
      }
    } catch (e) {
      console.error('Failed to update status on server:', e)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to remove this task?')) return

    const updated = todos.filter((t) => t.id !== id)
    setTodos(updated)
    localStorage.setItem('muve_local_todos', JSON.stringify(updated))

    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' })
      toast.success('Task deleted')
    } catch (e) {
      console.error(e)
    }
  }

  // Filtered todos
  const filteredTodos = todos.filter((t) => {
    if (filter === 'assigned') return !!t.assigned_by
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'completed') return t.status === 'completed'
    if (filter === 'reviewed') return t.admin_reviewed === true
    return true
  })

  const totalCount = todos.length
  const completedCount = todos.filter((t) => t.status === 'completed').length
  const pendingCount = todos.filter((t) => t.status === 'pending').length
  const reviewedCount = todos.filter((t) => t.admin_reviewed).length

  return (
    <div className="space-y-4 pb-12">
      {/* Top Mobile Header */}
      <div
        className="bg-gradient-to-b from-[#051824] via-[#072B3B] to-[#0a384d] text-white p-5 rounded-b-[28px] shadow-lg relative overflow-hidden"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 2.5rem)' }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Link
              href="/app/home"
              className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">My Tasks</h1>
                <span className="text-[10px] font-bold bg-[#D4FC04] text-black px-2 py-0.5 rounded-full">
                  Checklist
                </span>
              </div>
              <p className="text-xs text-slate-300">Daily checklist & admin-verified tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => user && fetchTodos(user.id)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white"
              title="Refresh tasks"
            >
              <Clock className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Chips */}
        <div className="grid grid-cols-4 gap-2 mt-4 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-300">Total</p>
            <p className="text-lg font-black text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="bg-amber-500/15 backdrop-blur-md rounded-xl p-2.5 text-center border border-amber-400/20">
            <p className="text-[10px] uppercase font-bold text-amber-200">Pending</p>
            <p className="text-lg font-black text-amber-300 mt-0.5">{pendingCount}</p>
          </div>
          <div className="bg-blue-500/15 backdrop-blur-md rounded-xl p-2.5 text-center border border-blue-400/20">
            <p className="text-[10px] uppercase font-bold text-blue-200">Done</p>
            <p className="text-lg font-black text-blue-300 mt-0.5">{completedCount}</p>
          </div>
          <div className="bg-emerald-500/15 backdrop-blur-md rounded-xl p-2.5 text-center border border-emerald-400/20">
            <p className="text-[10px] uppercase font-bold text-emerald-200">Reviewed</p>
            <p className="text-lg font-black text-emerald-300 mt-0.5">{reviewedCount}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 min-w-[65px] py-1.5 px-2.5 rounded-xl transition ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`flex-1 min-w-[100px] py-1.5 px-2.5 rounded-xl transition ${
              filter === 'assigned'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin Tasks ({todos.filter((t) => !!t.assigned_by).length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl transition ${
              filter === 'pending'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 min-w-[80px] py-1.5 px-3 rounded-xl transition ${
              filter === 'completed'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Done ({completedCount})
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-xl transition ${
              filter === 'reviewed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reviewed ({reviewedCount})
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <CheckSquare className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">No tasks in this view</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {filter === 'all'
                  ? 'Add your daily checkpoints, inspection notes or tasks for admin verification.'
                  : `There are currently no ${filter} tasks.`}
              </p>
            </div>
            {filter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTodos.map((todo) => {
              const isDone = todo.status === 'completed'
              const isReviewed = todo.admin_reviewed

              // Priority style
              const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
                urgent: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-600', label: 'Urgent' },
                high: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', label: 'High' },
                medium: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-600', label: 'Medium' },
                low: { bg: 'bg-slate-50 text-slate-600 border-slate-200', text: 'text-slate-500', label: 'Low' },
              }
              const pBadge = priorityColors[todo.priority] || priorityColors.medium

              return (
                <div
                  key={todo.id}
                  onClick={() => handleToggleStatus(todo)}
                  className={`bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                    isDone ? 'border-blue-100 bg-blue-50/20' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleStatus(todo)
                      }}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                          : 'border-2 border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                    >
                      {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pBadge.bg}`}
                          >
                            {pBadge.label}
                          </span>
                          {todo.assigned_by && (
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                              🛡️ Assigned by Admin
                            </span>
                          )}
                          {todo.user_id === 'all' && (
                            <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                              📢 All Users
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(todo.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(todo.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        className={`font-bold text-sm mt-1 tracking-tight ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {todo.title}
                      </h4>

                      {todo.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {todo.description}
                        </p>
                      )}

                      {/* Admin Verification Pill / Notes */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {isReviewed ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Checked & Verified by Admin</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Awaiting Admin Check</span>
                          </div>
                        )}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isDone
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isDone ? 'Completed' : 'Pending'}
                        </span>
                      </div>

                      {/* Admin Feedback note if available */}
                      {todo.admin_notes && (
                        <div className="mt-2 p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Admin Note: </span>
                            <span>{todo.admin_notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Add New Task</h3>
                  <p className="text-[11px] text-slate-400">Admin will review this checklist item</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTodo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Inspect Door 3 QR code & perimeter"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Inspection Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add details, observations, or equipment condition..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as TodoPriority[]).map((p) => {
                    const isSelected = taskPriority === p
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setTaskPriority(p)}
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

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add to List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
