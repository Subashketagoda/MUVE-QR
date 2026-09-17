'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
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
  RefreshCw,
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  X,
  ArrowLeft,
} from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'

export default function UserScanPage() {
  const [scannerActive, setScannerActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  // Multi-camera support
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  // Checkpoint codes modal state
  const [showCodesModal, setShowCodesModal] = useState(false)
  const [availableQRCodes, setAvailableQRCodes] = useState<any[]>([])
  const [qrImages, setQrImages] = useState<Record<string, string>>({})

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const isStartingRef = useRef(false)
  const isStoppingRef = useRef(false)

  // Safely stop scanner without leaving camera hardware locked
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true

    try {
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop()
        }
        try {
          html5QrcodeRef.current.clear()
        } catch (e) {
          // ignore clear error
        }
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err)
    } finally {
      setScannerActive(false)
      setTorchOn(false)
      setHasTorch(false)
      isStoppingRef.current = false
    }
  }, [])

  // Initialize and start scanner with multi-camera fallback
  const startScanner = useCallback(async (preferredCameraId?: string) => {
    if (isStartingRef.current) return
    isStartingRef.current = true

    setCameraLoading(true)
    setCameraError(null)

    // Stop existing instance first
    await stopScanner()

    try {
      const element = document.getElementById('qr-reader')
      if (!element) {
        isStartingRef.current = false
        setCameraLoading(false)
        return
      }

      // Enumerate cameras if not already done
      let availableCameras = cameras
      if (availableCameras.length === 0) {
        try {
          const devs = await Html5Qrcode.getCameras()
          if (devs && devs.length > 0) {
            setCameras(devs)
            availableCameras = devs
          }
        } catch (camListErr) {
          console.warn('Could not enumerate cameras:', camListErr)
        }
      }

      // Create new Html5Qrcode instance
      const scanner = new Html5Qrcode('qr-reader')
      html5QrcodeRef.current = scanner

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.max(160, Math.floor(minEdge * 0.72))
          return { width: size, height: size }
        },
        aspectRatio: 1.0,
      }

      const onScanSuccess = async (decodedText: string) => {
        if (isStartingRef.current) return
        await stopScanner()
        processScanToken(decodedText)
      }

      const onScanError = () => {
        // Continuous frame errors are normal during scanning, ignore
      }

      let started = false

      // Case 1: Specific camera requested (e.g. switch camera)
      if (preferredCameraId) {
        try {
          await scanner.start(preferredCameraId, config, onScanSuccess, onScanError)
          setCurrentCameraId(preferredCameraId)
          started = true
        } catch (e) {
          console.warn('Failed to start with preferredCameraId:', e)
        }
      }

      // Case 2: Try environment (rear) camera facingMode
      if (!started) {
        try {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            onScanSuccess,
            onScanError
          )
          started = true
        } catch (facingErr) {
          console.warn('Environment facingMode failed, falling back to camera IDs...', facingErr)
        }
      }

      // Case 3: Fallback using enumerated device IDs
      if (!started && availableCameras.length > 0) {
        // Try finding back camera first
        const backCamera =
          availableCameras.find((d) =>
            /back|rear|environment/i.test(d.label)
          ) || availableCameras[availableCameras.length - 1]

        try {
          await scanner.start(backCamera.id, config, onScanSuccess, onScanError)
          setCurrentCameraId(backCamera.id)
          started = true
        } catch (backCamErr) {
          // Fallback to first camera (e.g. front)
          if (availableCameras[0] && availableCameras[0].id !== backCamera.id) {
            await scanner.start(availableCameras[0].id, config, onScanSuccess, onScanError)
            setCurrentCameraId(availableCameras[0].id)
            started = true
          } else {
            throw backCamErr
          }
        }
      }

      if (started) {
        setScannerActive(true)
        setCameraError(null)

        // Check if torch/flashlight is supported
        try {
          // @ts-ignore
          const capabilities = scanner.getRunningTrackCapabilities?.()
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true)
          }
        } catch (e) {}
      } else {
        throw new Error('No camera stream could be established')
      }
    } catch (err: any) {
      console.warn('Camera start error:', err)
      const errString = String(err?.message || err)
      if (errString.includes('NotAllowedError') || errString.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser or device settings.')
      } else if (errString.includes('NotFoundError') || errString.includes('DevicesNotFoundError')) {
        setCameraError('No camera detected on this device.')
      } else if (errString.includes('NotReadableError') || errString.includes('TrackStartError')) {
        setCameraError('Camera is currently busy or locked by another app. Tap "Retry Camera" below.')
      } else {
        setCameraError('Unable to start camera. Please verify camera permissions or use the Test Simulator.')
      }
      setScannerActive(false)
    } finally {
      setCameraLoading(false)
      isStartingRef.current = false
    }
  }, [cameras, stopScanner])

  // Switch between available cameras
  const handleSwitchCamera = async () => {
    if (cameras.length < 2) {
      toast.info('Only one camera detected on this device.')
      return
    }

    const currentIndex = cameras.findIndex((c) => c.id === currentCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCamera = cameras[nextIndex]

    toast.info(`Switching camera...`)
    await startScanner(nextCamera.id)
  }

  // Toggle Torch/Flashlight if supported
  const handleToggleTorch = async () => {
    if (!html5QrcodeRef.current || !hasTorch) return
    try {
      const nextState = !torchOn
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      })
      setTorchOn(nextState)
    } catch (e) {
      toast.error('Flashlight not supported on this camera')
    }
  }

  // Load available checkpoint codes
  const loadAvailableCodes = useCallback(async () => {
    const DEFAULT_CHECKPOINTS = [
      {
        id: 'e2b55a08-f8bf-440d-b9c0-5ff9dafc6b1f',
        name: 'QR1',
        token: 'MUVEQR-MainEntrance-xK9mP2nQ8vR3tL7w',
        location_name: 'Main Entrance',
      },
      {
        id: '33fba264-73c7-47b4-a28b-57ee84b0be5e',
        name: 'QR2',
        token: 'MUVEQR-Office-yJ4nM6pS1uW5eA8d',
        location_name: 'Office',
      },
      {
        id: '36ba1b20-eff9-4b50-87df-aafc8b4f3d68',
        name: 'QR3',
        token: 'MUVEQR-Warehouse-zH7kB9qT0iC4fG2x',
        location_name: 'Warehouse',
      },
    ]

    let list = DEFAULT_CHECKPOINTS
    try {
      const raw = JSON.parse(localStorage.getItem('muve_local_qrcodes') || '[]')
      const local = (raw || []).filter((q: any) => q.id && !q.id.startsWith('qr_'))
      if (local && local.length > 0) {
        const map = new Map()
        DEFAULT_CHECKPOINTS.forEach((c) => map.set(c.id, c))
        local.forEach((c: any) => map.set(c.id, c))
        list = Array.from(map.values())
      }
    } catch (e) {}

    setAvailableQRCodes(list)

    const images: Record<string, string> = {}
    for (const item of list) {
      try {
        const scanUrl = `${process.env.NEXT_PUBLIC_QR_BASE_URL || 'https://muveqr.app/scan'}/${item.token}`
        const url = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 })
        images[item.id] = url
      } catch (e) {}
    }
    setQrImages(images)
  }, [])

  // Initial load
  useEffect(() => {
    startScanner()
    loadAvailableCodes()

    return () => {
      stopScanner()
    }
  }, [loadAvailableCodes])

  // Process scanned QR Token
  const processScanToken = async (qrTokenRaw: string) => {
    setScanning(true)
    setScanError(null)
    setScanResult(null)

    // Get logged in user from localStorage
    const saved = localStorage.getItem('muve_user')
    let userId = '00000000-0000-0000-0000-000000000002'
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        userId = (parsed.id === 'usr_user_001' || !parsed.id) ? '00000000-0000-0000-0000-000000000002' : parsed.id
      } catch (e) {}
    }

    try {
      // Get optional location coordinates
      let latitude: number | undefined
      let longitude: number | undefined

      if ('geolocation' in navigator) {
        try {
          const pos: any = await new Promise((resolve) =>
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
              timeout: 3000,
              maximumAge: 10000,
            })
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
          qrToken: qrTokenRaw.trim(),
          userId,
          latitude,
          longitude,
          deviceInfo: navigator.userAgent.includes('Mobile')
            ? 'Mobile Camera Scanner'
            : 'Desktop Browser Scanner',
        }),
      })

      const json = await res.json()

      const playScanBeep = (isSuccess = true) => {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          if (!AudioCtx) return
          const ctx = new AudioCtx()
          const now = ctx.currentTime
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          if (isSuccess) {
            osc.frequency.setValueAtTime(880, now) // A5
            osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.15) // E6
            gain.gain.setValueAtTime(0.2, now)
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now)
            osc.stop(now + 0.3)
          } else {
            osc.frequency.setValueAtTime(330, now)
            osc.frequency.linearRampToValueAtTime(220, now + 0.25)
            gain.gain.setValueAtTime(0.2, now)
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now)
            osc.stop(now + 0.25)
          }
        } catch (e) {}
      }

      if (!res.ok || !json.success) {
        setScanError(json.message || 'Scan validation failed')
        playScanBeep(false)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(250)
        }
        return
      }

      setScanResult(json.scan)
      playScanBeep(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      toast.success('✓ Scan Recorded!')

      // Persist in localStorage so scans survive server updates
      try {
        const localScans = JSON.parse(localStorage.getItem('muve_local_scans') || '[]')
        const scanItem = {
          id: json.scan.id,
          qr_name: json.scan.qr,
          location_name: json.scan.location,
          scanned_at: json.scan.timestamp,
          status: 'success',
          user_id: userId,
        }
        const merged = [scanItem, ...localScans.filter((s: any) => s.id !== scanItem.id)].slice(0, 100)
        localStorage.setItem('muve_local_scans', JSON.stringify(merged))
      } catch (e) {}
    } catch (err: any) {
      console.error('Scan error:', err)
      setScanError(err?.message || 'Network connection error while recording scan')
    } finally {
      setScanning(false)
    }
  }

  // Reset scan and restart camera
  const handleResetScan = () => {
    setScanResult(null)
    setScanError(null)
    startScanner()
  }

  return (
    <div
      className="p-4 space-y-3.5 max-w-lg mx-auto select-none"
      style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.5rem), 2.75rem)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/home"
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 active:scale-95 transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center flex-1 pr-10">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Scan QR Code</h2>
          <p className="text-xs text-slate-500 font-medium">Position code inside viewfinder</p>
        </div>
      </div>

      {/* VIEWPORT CAMERA / VIEWFINDER CONTAINER */}
      {/* Note: #qr-reader stays permanently in the DOM so React never loses the node! */}
      <div className="relative">
        <div
          className={`card overflow-hidden bg-black p-2 rounded-2xl min-h-[320px] sm:min-h-[360px] flex items-center justify-center relative shadow-xl border-2 ${
            scanResult
              ? 'border-emerald-500'
              : scanError
              ? 'border-red-500'
              : 'border-slate-800'
          }`}
        >
          {/* Permanent QR Reader Target Element */}
          <div
            id="qr-reader"
            className="w-full h-full rounded-xl overflow-hidden"
            style={{ minHeight: '300px' }}
          />

          {/* Scanner Optical Reticle Overlay (Only when camera is actively streaming) */}
          {scannerActive && !scanResult && !scanError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="scanner-frame">
                <div className="scan-line" />
              </div>
            </div>
          )}

          {/* Camera Loading Spinner */}
          {cameraLoading && !scanResult && !scanError && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-3 text-white p-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-sm text-slate-200">Starting Camera Feed...</p>
              <p className="text-[11px] text-slate-400">Requesting device video stream</p>
            </div>
          )}

          {/* Camera Error / Permission Fallback Screen */}
          {cameraError && !scanResult && !scanError && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white space-y-4 z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-300">Camera Unavailable</p>
                <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              </div>

              <div className="flex gap-2 w-full max-w-xs pt-1">
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="flex-1 btn btn-primary btn-sm rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Camera
                </button>
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="btn btn-secondary btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    Flip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Token Validating Modal Overlay */}
          {scanning && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center z-20">
              <div className="text-center space-y-3 p-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Validating Token...</p>
                  <p className="text-xs text-slate-500">Checking location point & records</p>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS RESULT OVERLAY */}
          {scanResult && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 to-teal-700 text-white rounded-2xl p-6 flex flex-col justify-between text-center z-20 animate-scale-in">
              <div className="space-y-3 pt-2">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md text-white mx-auto flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">✓ Scan Recorded</h3>
                  <p className="text-emerald-100 text-xs mt-0.5">Recorded to MUVE QR central cloud database</p>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 text-left space-y-2.5 text-xs border border-white/10 my-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-emerald-200">Checkpoint</span>
                  <span className="font-bold text-white text-sm">{scanResult.qr}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-emerald-200">Location Point</span>
                  <span className="font-bold text-white text-sm truncate max-w-[180px]">
                    {scanResult.location}
                  </span>
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
                type="button"
                onClick={handleResetScan}
                className="w-full btn bg-white text-emerald-900 hover:bg-emerald-50 font-black btn-lg shadow-xl active:scale-[0.98] transition"
              >
                <RotateCcw className="w-5 h-5" />
                Continue Scanning
              </button>
            </div>
          )}

          {/* REJECTED / ERROR RESULT OVERLAY */}
          {scanError && (
            <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-rose-700 text-white rounded-2xl p-6 flex flex-col justify-between text-center z-20 animate-scale-in">
              <div className="space-y-3 pt-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md text-white mx-auto flex items-center justify-center shadow-lg">
                  <XCircle className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Scan Rejected</h3>
                  <p className="text-red-100 text-xs mt-1 max-w-xs mx-auto">{scanError}</p>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 text-left text-xs border border-white/10 my-4 space-y-1">
                <p className="font-bold text-red-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Possible Reasons:
                </p>
                <ul className="list-disc list-inside text-[11px] text-red-100 space-y-0.5 pt-1">
                  <li>Invalid or expired QR token</li>
                  <li>Outside designated GPS geofence</li>
                  <li>QR point currently deactivated by Admin</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleResetScan}
                className="w-full btn bg-white text-red-700 hover:bg-red-50 font-black btn-lg shadow-xl active:scale-[0.98] transition"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Camera Controls Floating Toolbar (Flip Camera, Torch, Restart, View Codes) */}
        {!scanResult && !scanError && (
          <div className="grid grid-cols-4 gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={() => startScanner()}
              disabled={cameraLoading}
              className="btn btn-secondary btn-sm py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 shadow-xs hover:bg-slate-100"
              title="Restart Camera"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${cameraLoading ? 'animate-spin' : ''}`} />
              <span className="truncate">Reload</span>
            </button>

            {cameras.length > 1 ? (
              <button
                type="button"
                onClick={handleSwitchCamera}
                disabled={cameraLoading}
                className="btn btn-secondary btn-sm py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 shadow-xs hover:bg-slate-100"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">Switch</span>
              </button>
            ) : (
              <div className="invisible" />
            )}

            {hasTorch ? (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`btn btn-sm py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 shadow-xs ${
                  torchOn ? 'bg-amber-400 text-black hover:bg-amber-300' : 'btn-secondary hover:bg-slate-100'
                }`}
                title="Toggle Torch/Flash"
              >
                {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5 text-slate-600" />}
                <span className="truncate">{torchOn ? 'On' : 'Flash'}</span>
              </button>
            ) : (
              <div className="invisible" />
            )}

            <button
              type="button"
              onClick={() => {
                loadAvailableCodes()
                setShowCodesModal(true)
              }}
              className="btn btn-secondary btn-sm py-2 px-1 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 shadow-xs bg-[#072B3B] text-white hover:bg-[#072B3B]/90"
              title="View available checkpoint QR Codes"
            >
              <QrCode className="w-3.5 h-3.5 text-[#D4FC04]" />
              <span className="truncate">Codes</span>
            </button>
          </div>
        )}
      </div>

      {/* Checkpoint QR Codes Modal */}
      {showCodesModal && (
        <div className="modal-overlay z-30">
          <div className="modal-content p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto rounded-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Checkpoint QR Codes</h3>
                  <p className="text-[11px] text-slate-400">Available QR checkpoints to scan or test</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCodesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {availableQRCodes.map((qr) => (
                <div key={qr.id} className="card p-4 border border-slate-200 text-center space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-primary text-xs font-bold">{qr.name}</span>
                    <span className="text-xs font-semibold text-slate-700">{qr.location_name}</span>
                  </div>

                  {qrImages[qr.id] ? (
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block shadow-sm">
                      <img src={qrImages[qr.id]} alt={qr.name} className="w-44 h-44 mx-auto" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-mono break-all">{qr.token}</p>

                  <button
                    type="button"
                    onClick={async () => {
                      setShowCodesModal(false)
                      await stopScanner()
                      processScanToken(qr.token)
                    }}
                    className="w-full btn btn-primary btn-sm rounded-xl font-bold text-xs"
                  >
                    Test Scan this Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
