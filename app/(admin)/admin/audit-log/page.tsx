'use client'

import React, { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, Clock, User, HardDrive } from 'lucide-react'
import { AuditLogRow } from '@/types/database'

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs')
      const json = await res.json()
      if (json.success && json.auditLogs) {
        setAuditLogs(json.auditLogs)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    if (action.includes('created')) return 'badge-success'
    if (action.includes('suspended') || action.includes('deleted')) return 'badge-danger'
    if (action.includes('edited') || action.includes('changed')) return 'badge-warning'
    return 'badge-blue'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Audit Trail</h1>
        <p className="text-slate-500 text-sm">
          Immutable history of all administrative actions, system updates, and user modifications
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 skeleton rounded" />
            ))}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No audit log entries recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin Name</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-xs text-slate-700">
                      {new Date(log.created_at).toLocaleDateString('en-GB')} •{' '}
                      <span className="font-semibold text-slate-900">
                        {new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.admin_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-medium text-slate-800">
                      {log.target_name || log.target_id || 'N/A'}
                    </td>
                    <td className="font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : 'N/A'}
                    </td>
                    <td className="font-mono text-xs text-slate-400">{log.ip_address || '127.0.0.1'}</td>
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
