'use client'

import React, { useEffect, useState } from 'react'
import {
  FileBarChart2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  RefreshCw,
  Clock,
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { QRCodeRow, UserRow } from '@/types/database'

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodes, setQrCodes] = useState<QRCodeRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedQR, setSelectedQR] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    fetchFilterOptions()
    fetchReport()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      const [qrRes, userRes] = await Promise.all([fetch('/api/qr-codes'), fetch('/api/users')])
      const qrs = await qrRes.json()
      const usrs = await userRes.json()
      if (qrs.success) setQrCodes(qrs.qrCodes)
      if (usrs.success) setUsers(usrs.users)
    } catch (e) {
      console.error(e)
    }
  }

  function formatRowDateTime(
    scannedAt: string,
    fallbackDate?: string,
    fallbackTime?: string,
    fallbackTime24?: string
  ) {
    if (!scannedAt) {
      return {
        date: fallbackDate || 'N/A',
        time12: fallbackTime || 'N/A',
        time24: fallbackTime24 || fallbackTime || 'N/A',
      }
    }
    const d = new Date(scannedAt)
    if (isNaN(d.getTime())) {
      return {
        date: fallbackDate || 'N/A',
        time12: fallbackTime || 'N/A',
        time24: fallbackTime24 || fallbackTime || 'N/A',
      }
    }

    const date = d.toLocaleDateString('en-GB')
    const time12 = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    const time24 = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    return { date, time12, time24 }
  }

  const fetchReport = async (overrideStart?: string, overrideEnd?: string) => {
    setLoading(true)
    try {
      const sDate = overrideStart !== undefined ? overrideStart : startDate
      const eDate = overrideEnd !== undefined ? overrideEnd : endDate

      const params = new URLSearchParams()
      if (sDate) params.append('startDate', sDate)
      if (eDate) params.append('endDate', eDate)
      if (selectedUser) params.append('userId', selectedUser)
      if (selectedQR) params.append('qrId', selectedQR)
      if (selectedStatus) params.append('status', selectedStatus)

      try {
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (localTz) params.append('timezone', localTz)
      } catch (e) {}

      const res = await fetch(`/api/reports?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setReportData(json.report)
      }
    } catch (e) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const setPresetReport = (type: 'today' | 'week' | 'month') => {
    const now = new Date()
    let start = new Date()
    if (type === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (type === 'week') {
      start = new Date(now.getTime() - 7 * 86400000)
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const fmtLocal = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const sStr = fmtLocal(start)
    const eStr = fmtLocal(now)
    setStartDate(sStr)
    setEndDate(eStr)

    fetchReport(sStr, eStr)
  }

  // EXPORT 1: CSV
  const exportCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data available to export')
      return
    }
    const formatted = reportData.map((row) => {
      const dt = formatRowDateTime(row.scanned_at, row.date, row.time, row.time_24)
      return {
        Date: dt.date,
        'Exact Time (12h)': dt.time12,
        'Time (24h)': dt.time24,
        User: row.user,
        UserEmail: row.user_email,
        QRCode: row.qr,
        Location: row.location,
        Status: row.status,
        Device: row.device,
      }
    })
    const csv = Papa.unparse(formatted)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `MUVE_QR_Scan_Report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('CSV Report exported successfully')
  }

  // EXPORT 2: Excel (.xlsx)
  const exportExcel = () => {
    if (reportData.length === 0) {
      toast.error('No data available to export')
      return
    }
    const formatted = reportData.map((row) => {
      const dt = formatRowDateTime(row.scanned_at, row.date, row.time, row.time_24)
      return {
        Date: dt.date,
        'Exact Time (12h)': dt.time12,
        'Time (24h)': dt.time24,
        User: row.user,
        UserEmail: row.user_email,
        QRCode: row.qr,
        Location: row.location,
        Status: row.status,
        Device: row.device,
      }
    })
    const worksheet = XLSX.utils.json_to_sheet(formatted)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scan Report')
    XLSX.writeFile(workbook, `MUVE_QR_Scan_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel Report exported successfully')
  }

  // EXPORT 3: PDF (dynamic import on demand)
  const exportPDF = async () => {
    if (reportData.length === 0) {
      toast.error('No data available to export')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()

      // Title & Header
      doc.setFontSize(18)
      doc.setTextColor(7, 43, 59) // Dark navy
      doc.text('MUVE QR — Scan Activity Report', 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${reportData.length}`, 14, 28)

      const tableRows = reportData.map((row) => {
        const dt = formatRowDateTime(row.scanned_at, row.date, row.time, row.time_24)
        return [
          dt.date,
          `${dt.time12}\n(${dt.time24})`,
          row.user,
          row.qr,
          row.location,
          row.status.toUpperCase(),
        ]
      })

      autoTable(doc, {
        head: [['Date', 'Exact Time', 'User', 'QR Code', 'Location', 'Status']],
        body: tableRows,
        startY: 34,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [7, 43, 59] },
      })

      doc.save(`MUVE_QR_Scan_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF Report exported successfully')
    } catch (e: any) {
      console.error(e)
      toast.error('PDF export failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Export</h1>
          <p className="text-slate-500 text-sm">
            Generate custom filtered attendance reports and export to CSV, Excel, or PDF
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4 text-emerald-600" />
            CSV
          </button>
          <button onClick={exportExcel} className="btn btn-secondary btn-sm">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button onClick={exportPDF} className="btn btn-primary btn-sm">
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Preset Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
          Presets:
        </span>
        <button onClick={() => setPresetReport('today')} className="btn btn-secondary btn-sm text-xs">
          Daily Report
        </button>
        <button onClick={() => setPresetReport('week')} className="btn btn-secondary btn-sm text-xs">
          Weekly Report
        </button>
        <button onClick={() => setPresetReport('month')} className="btn btn-secondary btn-sm text-xs">
          Monthly Report
        </button>
      </div>

      {/* Filter Controls Card */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="form-label text-xs">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input text-xs"
          />
        </div>

        <div>
          <label className="form-label text-xs">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input text-xs"
          />
        </div>

        <div>
          <label className="form-label text-xs">User</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="form-input form-select text-xs"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label text-xs">QR Code</label>
          <select
            value={selectedQR}
            onChange={(e) => setSelectedQR(e.target.value)}
            className="form-input form-select text-xs"
          >
            <option value="">All QR Locations</option>
            {qrCodes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.location_name})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button onClick={() => fetchReport()} className="btn btn-primary btn-sm flex-1">
            <Filter className="w-4 h-4" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Report Results Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 skeleton rounded" />
            ))}
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileBarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No report records found</p>
            <p className="text-xs text-slate-400 mt-1">Adjust filters and click Apply Filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>QR Code</th>
                  <th>Location</th>
                  <th>Exact Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-slate-900">
                      {formatRowDateTime(row.scanned_at, row.date, row.time, row.time_24).date}
                    </td>
                    <td className="font-semibold text-slate-800">
                      {row.user}
                      {row.user_email && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {row.user_email}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-navy">{row.qr}</span>
                    </td>
                    <td className="text-slate-700">{row.location}</td>
                    <td className="font-mono text-xs font-semibold text-slate-900">
                      {(() => {
                        const dt = formatRowDateTime(row.scanned_at, row.date, row.time, row.time_24)
                        return (
                          <div>
                            <div className="flex items-center gap-1.5 text-slate-950 font-bold">
                              <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span>{dt.time12}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal pl-5 mt-0.5">
                              {dt.time24} (24h)
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          row.status === 'success' ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {row.status}
                      </span>
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
