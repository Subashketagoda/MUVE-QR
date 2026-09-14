'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Logo } from '@/components/shared/Logo'
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  Calendar,
  RotateCcw,
  Camera,
  AlertOctagon,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeRow } from '@/types/database'

export default function UserScanPage() {
  const [scannerActive, setScannerActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [demoQRCodes, setDemoQRCodes] = useState<QRCodeRow[]>([])

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    fetchDemoQRCodes()
    startScanner()

    return () => {
      stopScanner()
    }
  }, [])

  const fetchDemoQRCodes = async () => {
    try {
      const res = await fetch('/api/qr-codes')
      const json = await res.json()
      if (json.success && json.qrCodes) {
        setDemoQRCodes(json.qrCodes)
      }
    } catch (e) {}
  }

  const startScanner = async () => {
    setScanResult(null)
    setScanError(null)
    setCameraError(null)

    try {
      // Ensure element exists
      const element = document.getElementById('qr-reader')
      if (!element) return

      const html5Qrcode = new Html5Qrcode('qr-reader')
      html5QrcodeRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      )
      setScannerActive(true)
    } catch (err: any) {
      console.warn('Camera access error:', err)
      setCameraError('Camera permission denied or camera unavailable on this device.')
      setScannerActive(false)
    }
  }

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current.clear()
      } catch (e) {}
    }
    setScannerActive(false)
  }

  const onScanSuccess = async (decodedText: string) => {
    if (scanning) return
    setScanning(true)
    await stopScanner()
    processScanToken(decodedText)
  }

  const onScanError = (errorMessage: string) => {
    // Ignore frame read errors
  }

  const processScanToken = async (qrTokenRaw: string) => {
    // Get logged in user from localStorage
    const saved = localStorage.getItem('muve_user')
    let userId = 'usr_user_001'
    if (saved) {
      try {
        userId = JSON.parse(saved).id
      } catch (e) {}
    }

    try {
      // Get optional location coordinates
      let latitude: number | undefined
      let longitude: number | undefined

      if ('geolocation' in navigator) {
        try {
          const pos: any = await new Promise((resolve) =>
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 })
          )
          if (pos) {
            latitude = pos.coords.latitude
            longitude = pos.coords.longitude
          }
        } catch (e) {}
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: qrTokenRaw,
          userId,
          latitude,
          longitude,
          deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Camera Scanner' : 'Desktop Browser Scanner',
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setScanError(json.message || 'Scan validation failed')
        setScanning(false)
        return
      }

      setScanResult(json.scan)
      toast.success('✓ Scan Recorded!')
    } catch (err: any) {
      setScanError('Network error while recording scan')
    } finally {
      setScanning(false)
    }
  }

  const handleResetScan = () => {
    setScanResult(null)
    setScanError(null)
    startScanner()
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center pt-2">
        <Logo size="sm" showSubtitle={true} subtitleText="COLOMBO" />
        <h2 className="text-xl font-bold text-slate-900 mt-2">Scan QR Code</h2>
        <p className="text-xs text-slate-500">Position the QR code within the frame below</p>
      </div>

      {/* SCANNER CAMERA BOX */}
      {!scanResult && !scanError && (
        <div className="relative">
          <div className="card overflow-hidden bg-black p-2 rounded-2xl min-h-[300px] flex items-center justify-center">
            <div id="qr-reader" className="w-full h-full rounded-xl" />

            {/* Scanner Frame Overlay */}
            {scannerActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="scanner-frame">
                  <div className="scan-line" />
                </div>
              </div>
            )}

            {/* Camera Error fallback */}
            {cameraError && (
              <div className="p-6 text-center text-white space-y-3">
                <Camera className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-red-400">{cameraError}</p>
                <p className="text-xs text-slate-300">
                  You can use the simulated QR test buttons below to test scanning!
                </p>
              </div>
            )}
          </div>

          {scanning && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-bold text-slate-800 text-sm">Validating QR Token...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUCCESS OVERLAY SCREEN */}
      {scanResult && (
        <div className="card p-6 bg-gradient-to-b from-emerald-500 to-teal-600 text-white rounded-2xl shadow-2xl space-y-6 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">✓ Scan Successful</h3>
            <p className="text-emerald-100 text-xs mt-1">Recorded to MUVE QR central log</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-emerald-200">QR Code</span>
              <span className="font-bold text-white text-sm">{scanResult.qr}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-emerald-200">Location Point</span>
              <span className="font-bold text-white text-sm">{scanResult.location}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-emerald-200">Scanned by</span>
              <span className="font-semibold text-white">{scanResult.user}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-emerald-200">Exact Time</span>
              <span className="font-mono font-bold text-white">
                {new Date(scanResult.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-200">Date</span>
              <span className="font-semibold text-white">
                {new Date(scanResult.timestamp).toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>

          <button
            onClick={handleResetScan}
            className="w-full btn bg-white text-emerald-800 hover:bg-emerald-50 font-bold btn-lg shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Continue Scanning
          </button>
        </div>
      )}

      {/* ERROR OVERLAY SCREEN */}
      {scanError && (
        <div className="card p-6 bg-red-500 text-white rounded-2xl shadow-2xl space-y-6 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white mx-auto flex items-center justify-center">
            <XCircle className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">Scan Rejected</h3>
            <p className="text-red-100 text-sm mt-2">{scanError}</p>
          </div>

          <button
            onClick={handleResetScan}
            className="w-full btn bg-white text-red-700 hover:bg-red-50 font-bold btn-lg shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      )}

      {/* SIMULATED QR TESTING PANEL */}
      {!scanResult && !scanError && (
        <div className="card p-4 space-y-3 bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Quick Test QR Simulator
            </h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Click any active QR point below to simulate scanning without camera:
          </p>
          <div className="space-y-2">
            {demoQRCodes.map((qr) => (
              <button
                key={qr.id}
                onClick={() => processScanToken(qr.token)}
                className="w-full p-2.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-left flex items-center justify-between transition group"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600">
                    {qr.name} • {qr.location_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{qr.token}</p>
                </div>
                <span className="badge badge-blue text-[10px]">Test Scan</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
