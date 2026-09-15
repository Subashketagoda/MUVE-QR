'use client'

import React, { useEffect, useState } from 'react'
import {
  Users as UsersIcon,
  UserPlus,
  Edit2,
  Lock,
  Ban,
  CheckCircle,
  Eye,
  X,
  Search,
  KeyRound,
  Shield,
  Clock,
  QrCode,
  History,
} from 'lucide-react'
import { UserRow } from '@/types/database'
import { toast } from 'sonner'

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    password: '',
  })

  // User Profile Drawer State
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [userScanStats, setUserScanStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (e) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'user',
      status: 'active',
      password: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (user: UserRow) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      password: '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        email: formData.email || (formData.phone ? `${formData.phone.replace(/[^0-9]/g, '')}@muveqr.app` : ''),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.message || 'Action failed')
        return
      }

      toast.success(editingUser ? 'User details updated' : 'New user created successfully')
      setIsModalOpen(false)
      fetchUsers()
    } catch (e) {
      toast.error('Error saving user')
    }
  }

  const handleToggleStatus = async (user: UserRow, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`User ${user.full_name} is now ${newStatus}`)
        fetchUsers()
      }
    } catch (e) {
      toast.error('Failed to update user status')
    }
  }

  const handleResetPassword = async (user: UserRow) => {
    const newPass = prompt(`Enter new password for ${user.full_name}:`, 'User@123456')
    if (!newPass) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Password reset successful for ${user.full_name}`)
      }
    } catch (e) {
      toast.error('Password reset failed')
    }
  }

  const handleViewProfile = async (user: UserRow) => {
    setSelectedUser(user)
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/scans?userId=${user.id}&limit=50`)
      const json = await res.json()
      if (json.success) {
        const userScans = json.scans || []
        const total = userScans.length
        const lastScan = userScans[0] || null

        // Count most visited QR
        const qrCountMap: Record<string, number> = {}
        userScans.forEach((s: any) => {
          qrCountMap[s.qr_name] = (qrCountMap[s.qr_name] || 0) + 1
        })
        let mostVisited = 'N/A'
        let maxCount = 0
        Object.entries(qrCountMap).forEach(([qr, c]) => {
          if (c > maxCount) {
            maxCount = c
            mostVisited = qr
          }
        })

        setUserScanStats({
          totalScans: total,
          lastScan,
          mostVisited,
          scans: userScans.slice(0, 5),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">
            Manage user accounts, roles, access permissions, and activity metrics
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm">
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user name, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 skeleton rounded-lg" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No users match criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {u.full_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.full_name}</p>
                          <p className="text-[11px] font-mono font-medium text-blue-600">{u.phone || u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-600">{u.id}</td>
                    <td className="text-xs text-slate-600">{u.phone || 'N/A'}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin' ? 'badge-navy' : 'badge-gray'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.status === 'active'
                            ? 'badge-success'
                            : u.status === 'suspended'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewProfile(u)}
                          className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-blue-600"
                          title="View Profile & Scans"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-blue-600"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-purple-600"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {u.status === 'active' ? (
                          <button
                            onClick={() => handleToggleStatus(u, 'suspended')}
                            className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50"
                            title="Suspend User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u, 'active')}
                            className="btn btn-ghost btn-sm p-2 text-emerald-600 hover:bg-emerald-50"
                            title="Reactivate User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User Profile' : 'Create New User Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Phone Number (Required for Login)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 077 111 1111"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="john@organization.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="form-input form-select"
                  >
                    <option value="user">User (Mobile Scanner)</option>
                    <option value="admin">Admin (Full Dashboard)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-input form-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="form-label">Initial Password</label>
                  <input
                    type="password"
                    placeholder="User@123456"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Detail Drawer */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedUser.full_name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedUser.full_name}</h3>
                  <p className="text-xs text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStats ? (
              <div className="space-y-3 py-6">
                <div className="h-16 skeleton rounded-xl" />
                <div className="h-32 skeleton rounded-xl" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Scans</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{userScanStats?.totalScans || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Most Visited</p>
                    <p className="text-sm font-bold text-blue-600 mt-1 truncate">
                      {userScanStats?.mostVisited || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Status</p>
                    <span className="badge badge-success mt-1">{selectedUser.status}</span>
                  </div>
                </div>

                {/* Recent Activity List */}
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
                    Recent Scan Activity
                  </h4>
                  {userScanStats?.scans?.length === 0 ? (
                    <p className="text-xs text-slate-400">No scans recorded for this user yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {userScanStats?.scans?.map((scan: any) => (
                        <div
                          key={scan.id}
                          className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="font-semibold text-slate-800">
                                {scan.qr_name} • {scan.location_name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(scan.scanned_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <span className="badge badge-success">Success</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
