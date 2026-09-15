'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
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
  Sparkles,
  RefreshCw,
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeRow } from '@/types/database'

export default function UserScanPage() {
  const [scannerActive, setScannerActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [demoQRCodes, setDemoQRCodes] = useState<QRCodeRow[]>([])

  // Multi-camera support
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const isStartingRef = useRef(false)
  const isStoppingRef = useRef(false)

  // Fetch available demo QR codes for simulator fallback
  const fetchDemoQRCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/qr-codes')
      const json = await res.json()
      if (json.success && json.qrCodes) {
        setDemoQRCodes(json.qrCodes)
      }
    } catch (e) {
      console.warn('Failed to fetch demo codes', e)
    }
  }, [])

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
      // @ts-ignore
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      })
      setTorchOn(nextState)
    } catch (e) {
      toast.error('Flashlight not supported on this camera')
    }
  }

  // Initial load
  useEffect(() => {
    fetchDemoQRCodes()
    startScanner()

    return () => {
      stopScanner()
    }
  }, [])

  // Process scanned QR Token
  const processScanToken = async (qrTokenRaw: string) => {
    setScanning(true)
    setScanError(null)
    setScanResult(null)

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

      if (!res.ok || !json.success) {
        setScanError(json.message || 'Scan validation failed')
        return
      }

      setScanResult(json.scan)
      toast.success('✓ Scan Recorded!')
    } catch (err: any) {
      setScanError('Network connection error while recording scan')
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
    <div className="p-4 space-y-5 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="text-center pt-2">
        <Logo size="sm" showSubtitle={true} subtitleText="COLOMBO" />
        <h2 className="text-xl font-black text-slate-900 mt-2 tracking-tight">Scan QR Code</h2>
        <p className="text-xs text-slate-500">Position the MUVE QR token inside the viewfinder</p>
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

              <p className="text-[11px] text-slate-400 pt-1">
                Tip: You can also use the <strong>Test Simulator</strong> below to test scanning without camera!
              </p>
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

        {/* Camera Controls Floating Toolbar (Flip Camera, Torch, Restart) */}
        {!scanResult && !scanError && (
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startScanner()}
                disabled={cameraLoading}
                className="btn btn-secondary btn-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                title="Restart Camera"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cameraLoading ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  disabled={cameraLoading}
                  className="btn btn-secondary btn-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>Switch Lens</span>
                </button>
              )}
            </div>

            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`btn btn-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs ${
                  torchOn ? 'bg-amber-400 text-black hover:bg-amber-300' : 'btn-secondary'
                }`}
                title="Toggle Torch/Flash"
              >
                {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                <span>{torchOn ? 'Flash On' : 'Flash'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* SIMULATED QR TESTING PANEL (Accessible for fallback testing) */}
      {!scanResult && !scanError && (
        <div className="card p-4 space-y-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Quick Test QR Simulator
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">No Camera Required</span>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Tap any active checkpoint below to test scan submission instantly:
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {demoQRCodes.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                Loading test QR codes...
              </div>
            ) : (
              demoQRCodes.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => processScanToken(qr.token)}
                  disabled={scanning}
                  className="w-full p-2.5 bg-white hover:bg-blue-50 active:scale-[0.99] border border-slate-200 rounded-xl text-left flex items-center justify-between transition group cursor-pointer shadow-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600 truncate">
                      {qr.name} • {qr.location_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{qr.token}</p>
                  </div>
                  <span className="badge badge-blue text-[10px] flex-shrink-0">Test Scan</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
