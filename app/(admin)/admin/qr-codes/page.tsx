'use client'

import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import {
  Plus,
  Download,
  Printer,
  Edit2,
  Power,
  Archive,
  QrCode as QrIcon,
  MapPin,
  X,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { QRCodeRow } from '@/types/database'
import { toast } from 'sonner'

const DEFAULT_QR_CODES: QRCodeRow[] = [
  {
    id: 'e2b55a08-f8bf-440d-b9c0-5ff9dafc6b1f',
    name: 'QR1',
    token: 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w',
    location_name: 'Main Entrance',
    description: 'Primary building entrance scanner point',
    status: 'active',
    latitude: 6.9271,
    longitude: 79.8612,
    geofence_radius: null,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33fba264-73c7-47b4-a28b-57ee84b0be5e',
    name: 'QR2',
    token: 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',
    location_name: 'Office',
    description: 'Main executive office area access point',
    status: 'active',
    latitude: 6.9275,
    longitude: 79.8615,
    geofence_radius: null,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '36ba1b20-eff9-4b50-87df-aafc8b4f3d68',
    name: 'QR3',
    token: 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',
    location_name: 'Warehouse',
    description: 'Warehouse loading dock entrance checkpoint',
    status: 'active',
    latitude: 6.9280,
    longitude: 79.8620,
    geofence_radius: null,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default function QRCodesPage() {
  const [qrCodes, setQrCodes] = useState<QRCodeRow[]>(DEFAULT_QR_CODES)
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQR, setEditingQR] = useState<QRCodeRow | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location_name: '',
    description: '',
    status: 'active',
    latitude: '',
    longitude: '',
    geofence_radius: '',
  })

  // Selected QR Preview Modal
  const [previewQR, setPreviewQR] = useState<QRCodeRow | null>(null)
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string>('')

  useEffect(() => {
    fetchQRCodes()
  }, [])

  const fetchQRCodes = async () => {
    setLoading(true)
    let localList: QRCodeRow[] = []
    try {
      const raw = JSON.parse(localStorage.getItem('muve_local_qrcodes') || '[]')
      localList = (raw || []).filter((q: any) => q.id && !q.id.startsWith('qr_'))
      if (localList.length > 0) {
        setQrCodes(localList)
      } else {
        setQrCodes(DEFAULT_QR_CODES)
      }
    } catch (e) {
      setQrCodes(DEFAULT_QR_CODES)
    }

    try {
      const res = await fetch('/api/qr-codes')
      const data = await res.json()
      const serverList =
        data.success && data.qrCodes && data.qrCodes.length > 0
          ? data.qrCodes
          : DEFAULT_QR_CODES

      const map = new Map()
      // Put default demo codes first
      DEFAULT_QR_CODES.forEach((q: any) => map.set(q.id, q))
      // Merge local storage codes
      localList.forEach((q: any) => map.set(q.id, q))
      // Merge server codes
      serverList.forEach((q: any) => map.set(q.id, q))

      const combined = Array.from(map.values()) as QRCodeRow[]
      setQrCodes(combined)
      localStorage.setItem('muve_local_qrcodes', JSON.stringify(combined))
    } catch (e) {
      if (localList.length === 0) {
        setQrCodes(DEFAULT_QR_CODES)
        localStorage.setItem('muve_local_qrcodes', JSON.stringify(DEFAULT_QR_CODES))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreDefaults = () => {
    const map = new Map()
    DEFAULT_QR_CODES.forEach((q) => map.set(q.id, q))
    qrCodes.forEach((q) => map.set(q.id, q))
    const merged = Array.from(map.values())
    setQrCodes(merged)
    localStorage.setItem('muve_local_qrcodes', JSON.stringify(merged))
    toast.success('Default QR codes restored (QR1, QR2, QR3)')
  }

  const handleOpenCreateModal = () => {
    setEditingQR(null)
    setFormData({
      name: '',
      location_name: '',
      description: '',
      status: 'active',
      latitude: '',
      longitude: '',
      geofence_radius: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (qr: QRCodeRow) => {
    setEditingQR(qr)
    setFormData({
      name: qr.name,
      location_name: qr.location_name,
      description: qr.description || '',
      status: qr.status,
      latitude: qr.latitude ? String(qr.latitude) : '',
      longitude: qr.longitude ? String(qr.longitude) : '',
      geofence_radius: qr.geofence_radius ? String(qr.geofence_radius) : '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingQR ? `/api/qr-codes/${editingQR.id}` : '/api/qr-codes'
      const method = editingQR ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.message || 'Operation failed')
        return
      }

      toast.success(editingQR ? 'QR Code updated' : 'New QR Code generated')
      setIsModalOpen(false)
      fetchQRCodes()
    } catch (e) {
      toast.error('Error saving QR code')
    }
  }

  const handleToggleStatus = async (qr: QRCodeRow) => {
    const newStatus = qr.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/qr-codes/${qr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`QR Code status set to ${newStatus}`)
        fetchQRCodes()
      }
    } catch (e) {
      toast.error('Failed to change status')
    }
  }

  const handleOpenPreview = async (qr: QRCodeRow) => {
    setPreviewQR(qr)
    try {
      // The QR image encodes the full scan URL
      const qrScanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${qr.token}`
      const url = await QRCode.toDataURL(qrScanUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#072B3B',
          light: '#FFFFFF',
        },
      })
      setQrImageDataUrl(url)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownloadQR = async (qr: QRCodeRow, dataUrl?: string) => {
    try {
      let finalUrl = dataUrl || qrImageDataUrl
      if (!finalUrl) {
        const qrScanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${qr.token}`
        finalUrl = await QRCode.toDataURL(qrScanUrl, {
          width: 800,
          margin: 2,
          color: {
            dark: '#072B3B',
            light: '#FFFFFF',
          },
        })
      }

      // Convert data URL to Blob for rock-solid cross-browser & mobile downloads
      const res = await fetch(finalUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const filename = `MUVE_QR_${qr.name}_${qr.location_name.replace(/\s+/g, '_')}.png`

      // On mobile devices, try native Web Share API to allow Save to Photos/Gallery
      if (typeof navigator !== 'undefined' && navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
          const file = new File([blob], filename, { type: 'image/png' })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `MUVE QR - ${qr.name}`,
              text: `QR Code for ${qr.location_name}`,
            })
            toast.success('QR Code shared / saved')
            return
          }
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return
        }
      }

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      }, 200)

      toast.success('QR Code image downloaded')
    } catch (e) {
      console.error('Download error:', e)
      toast.error('Failed to download QR code')
    }
  }

  const handleDownloadPDF = async (qr: QRCodeRow) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const qrScanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${qr.token}`
      const url = await QRCode.toDataURL(qrScanUrl, { width: 600, margin: 2 })

      // Header branding
      doc.setFillColor(7, 43, 59)
      doc.rect(0, 0, 210, 36, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('MUVE QR', 105, 20, { align: 'center' })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('ENTERPRISE ACTIVITY & LOCATION TRACKING', 105, 28, { align: 'center' })

      // Checkpoint details
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(qr.name, 105, 54, { align: 'center' })

      doc.setTextColor(37, 99, 235)
      doc.setFontSize(13)
      doc.text(qr.location_name, 105, 63, { align: 'center' })

      // QR Code image
      doc.addImage(url, 'PNG', 45, 74, 120, 120)

      // Token display box
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(30, 204, 150, 14, 3, 3, 'F')
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.setFont('courier', 'bold')
      doc.text(`Token: ${qr.token}`, 105, 213, { align: 'center' })

      // Instructions
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('Scan with your smartphone camera or the official MUVE QR Mobile App', 105, 235, { align: 'center' })

      doc.save(`MUVE_QR_PRINT_${qr.name}_${qr.location_name.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF Badge downloaded!')
    } catch (e) {
      console.error('PDF error:', e)
      toast.error('Failed to generate PDF')
    }
  }

  const handlePrintQR = (qr: QRCodeRow) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrScanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${qr.token}`

    QRCode.toDataURL(qrScanUrl, { width: 500, margin: 2 }, (err: any, url: any) => {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR - ${qr.name}</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 40px; }
              .card { border: 2px solid #072B3B; padding: 30px; border-radius: 20px; max-width: 400px; margin: 0 auto; }
              h1 { margin: 0; color: #072B3B; font-size: 32px; }
              h3 { margin: 8px 0 20px; color: #2563eb; font-size: 20px; }
              img { width: 280px; height: 280px; }
              .footer { margin-top: 20px; font-size: 12px; color: #64748b; font-weight: bold; letter-spacing: 2px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>MUVE QR</h1>
              <h3>${qr.name} • ${qr.location_name}</h3>
              <img src="${url}" />
              <p class="footer">SCAN • TRACK • MOVE FORWARD</p>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QR Code Management</h1>
          <p className="text-slate-500 text-sm">
            Create, edit, activate, and manage location QR codes across your facilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Restore default demo QR codes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>
          <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Create QR Code</span>
          </button>
        </div>
      </div>

      {/* Grid of QR Code Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="card p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <QrIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">No QR Codes Found</h3>
            <p className="text-slate-500 text-sm mt-1">
              Restore the default checkpoint codes (QR1, QR2, QR3) or create a new code.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={handleRestoreDefaults} className="btn btn-primary btn-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              Restore Defaults
            </button>
            <button onClick={handleOpenCreateModal} className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qr) => (
            <QRCard
              key={qr.id}
              qr={qr}
              onPreview={() => handleOpenPreview(qr)}
              onDownload={(url) => handleDownloadQR(qr, url)}
              onEdit={() => handleOpenEditModal(qr)}
              onToggleStatus={() => handleToggleStatus(qr)}
              onPrint={() => handlePrintQR(qr)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingQR ? 'Edit QR Code' : 'Create New QR Code'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">QR Code Identifier / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QR1 or Main Gate Scanner"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Location / Point Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Entrance, Warehouse Dock 2"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Additional location notes or access guidelines"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input h-20"
                />
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
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save QR Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Preview & Download Modal */}
      {previewQR && (
        <div className="modal-overlay">
          <div className="modal-content p-6 text-center max-w-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">QR Preview: {previewQR.name}</h3>
              <button onClick={() => setPreviewQR(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block mb-4">
              {qrImageDataUrl ? (
                <img src={qrImageDataUrl} alt={previewQR.name} className="w-56 h-56 mx-auto rounded-lg" />
              ) : (
                <div className="w-56 h-56 skeleton rounded-lg" />
              )}
            </div>

            <div className="space-y-1 mb-6 text-slate-700">
              <p className="font-bold text-lg text-slate-900">{previewQR.name}</p>
              <p className="text-sm font-medium text-blue-600 flex items-center justify-center gap-1">
                <MapPin className="w-4 h-4" />
                {previewQR.location_name}
              </p>
              <p className="text-xs text-slate-400 font-mono break-all mt-2 bg-slate-100 p-2 rounded">
                Token: {previewQR.token}
              </p>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownloadQR(previewQR)}
                  className="btn btn-primary btn-sm w-full font-bold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download PNG
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewQR)}
                  className="btn btn-secondary btn-sm w-full font-bold flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <Download className="w-4 h-4 text-purple-600" />
                  PDF Badge
                </button>
              </div>

              <button
                onClick={() => handlePrintQR(previewQR)}
                className="btn btn-ghost btn-sm w-full text-slate-600 hover:text-slate-900 border border-slate-200"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Sticker / Poster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual QR Card Component
function QRCard({
  qr,
  onPreview,
  onDownload,
  onEdit,
  onToggleStatus,
  onPrint,
}: {
  qr: QRCodeRow
  onPreview: () => void
  onDownload: (dataUrl?: string) => void
  onEdit: () => void
  onToggleStatus: () => void
  onPrint: () => void
}) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    const qrScanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${qr.token}`
    QRCode.toDataURL(qrScanUrl, { width: 200, margin: 1, color: { dark: '#072B3B', light: '#FFFFFF' } }).then(
      setDataUrl
    )
  }, [qr.token])

  return (
    <div className="qr-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900">{qr.name}</h3>
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {qr.location_name}
            </p>
          </div>

          <span
            className={`badge ${
              qr.status === 'active'
                ? 'badge-success'
                : qr.status === 'inactive'
                ? 'badge-warning'
                : 'badge-gray'
            }`}
          >
            {qr.status}
          </span>
        </div>

        {qr.description && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{qr.description}</p>}

        {/* QR Image Canvas Display */}
        <div
          onClick={onPreview}
          className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition group mb-4"
        >
          {dataUrl ? (
            <img src={dataUrl} alt={qr.name} className="w-36 h-36 rounded group-hover:scale-105 transition" />
          ) : (
            <div className="w-36 h-36 skeleton rounded" />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDownload(dataUrl)}
            className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            title="Download QR Image"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onPrint}
            className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            title="Print QR"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="btn btn-ghost btn-sm p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            title="Edit QR"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onToggleStatus}
          className={`btn btn-sm text-xs ${
            qr.status === 'active' ? 'btn-secondary text-amber-600' : 'btn-primary'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {qr.status === 'active' ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
