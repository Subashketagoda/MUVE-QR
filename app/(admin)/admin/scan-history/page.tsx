'use client'

import React, { useEffect, useState } from 'react'
import { Search, Filter, RefreshCw, Calendar, MapPin, Monitor, Smartphone, CheckCircle, XCircle } from 'lucide-react'
import { QRCodeRow, UserRow } from '@/types/database'

export default function ScanHistoryPage() {
  const [scans, setScans] = useState<any[]>([])
  const [qrCodes, setQrCodes] = useState<QRCodeRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedQR, setSelectedQR] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchScans()
  }, [search, selectedQR, selectedUser, selectedStatus])

  const fetchInitialData = async () => {
    try {
      const [qrRes, userRes] = await Promise.all([
        fetch('/api/qr-codes'),
        fetch('/api/users'),
      ])
      const qrData = await qrRes.json()
      const userData = await userRes.json()

      if (qrData.success) setQrCodes(qrData.qrCodes)
      if (userData.success) setUsers(userData.users)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchScans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedQR) params.append('qrId', selectedQR)
      if (selectedUser) params.append('userId', selectedUser)
      if (selectedStatus) params.append('status', selectedStatus)

      const res = await fetch(`/api/scans?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setScans(json.scans)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleResetFilters = () => {
    setSearch('')
    setSelectedQR('')
    setSelectedUser('')
    setSelectedStatus('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scan History</h1>
        <p className="text-slate-500 text-sm">
          Complete searchable and filterable log of all historical scan activity
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search location, QR, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>

        {/* QR Filter */}
        <select
          value={selectedQR}
          onChange={(e) => setSelectedQR(e.target.value)}
          className="form-input form-select text-xs min-w-[140px]"
        >
          <option value="">All QR Codes</option>
          {qrCodes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name} ({q.location_name})
            </option>
          ))}
        </select>

        {/* User Filter */}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="form-input form-select text-xs min-w-[140px]"
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="form-input form-select text-xs min-w-[120px]"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="cooldown">Cooldown</option>
          <option value="rejected">Rejected</option>
          <option value="geofence_fail">Geofence Fail</option>
        </select>

        <button onClick={handleResetFilters} className="btn btn-secondary btn-sm text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Scans Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 skeleton rounded-md" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No scan history records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filter search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th># Log ID</th>
                  <th>User</th>
                  <th>QR Code</th>
                  <th>Location</th>
                  <th>Date & Time</th>
                  <th>Device / GPS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scans.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs text-slate-400">#{s.id.slice(-6)}</td>
                    <td className="font-semibold text-slate-900">
                      {s.user_name || s.users?.full_name || 'User 01'}
                    </td>
                    <td>
                      <span className="badge badge-navy">{s.qr_name}</span>
                    </td>
                    <td className="text-slate-800">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.location_name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-700">
                      {new Date(s.scanned_at).toLocaleDateString('en-GB')} •{' '}
                      <span className="font-semibold text-slate-900">
                        {new Date(s.scanned_at).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.device_info || 'Mobile App'}</span>
                      </div>
                      {s.latitude && s.longitude && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          GPS: {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                        </p>
                      )}
                    </td>
                    <td>
                      {s.status === 'success' ? (
                        <span className="badge badge-success">Success</span>
                      ) : (
                        <span className="badge badge-danger">{s.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
