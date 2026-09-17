'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Logo } from '@/components/shared/Logo'
import { 
  Download, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  QrCode, 
  Sparkles,
  ExternalLink,
  Share2,
  AlertCircle
} from 'lucide-react'
import QRCodeLib from 'qrcode'

export default function DownloadPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Generate QR code for mobile scanning
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3002/download'
    QRCodeLib.toDataURL(currentUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#050D1A',
        light: '#FFFFFF',
      },
    }).then((url: string) => setQrDataUrl(url))

    // Capture PWA install prompt on Android Chrome
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setIsInstallable(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handlePwaInstall = async () => {
    if (!deferredPrompt) {
      alert('To install on Android: Tap the 3 dots in Chrome (⋮) and tap "Add to Home screen" or "Install App"')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white selection:bg-[#D4FC04] selection:text-black">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#D4FC04]/5 blur-[140px]" />
        <div className="absolute top-[50%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[160px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-navy-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo size="md" variant="dark" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/home"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              Web App
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-white transition"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Top Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4FC04]/10 border border-[#D4FC04]/30 text-xs font-semibold uppercase tracking-wider text-[#D4FC04] mb-6">
            <Smartphone className="w-4 h-4" />
            Official Android Mobile Release
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Download <span className="text-[#D4FC04]">MUVE QR</span> for Android
          </h1>

          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
            Install the native Android app for high-speed camera scanning, instant GPS geofence validation, 
            offline capability, and field attendance tracking.
          </p>
        </div>

        {/* Download Grid: APK Direct & QR Scan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          {/* Left Column: Direct APK Download Card */}
          <div className="lg:col-span-7 bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  alt="MUVE QR" 
                  className="w-16 h-16 rounded-2xl border border-[#D4FC04]/40 shadow-lg object-cover bg-navy-950 flex-shrink-0" 
                />
                <div>
                  <span className="text-xs font-bold text-[#D4FC04] uppercase tracking-wider">Official Android Release</span>
                  <h3 className="text-2xl font-bold text-white mt-0.5">MUVE QR v1.0.0</h3>
                  <p className="text-xs text-zinc-400 mt-1">Package: app.muveqr.tracker • Size: ~3.8 MB</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Clean
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 mb-8">
              {/* Primary APK Download Button */}
              <a
                href="/downloads/muve-qr-v1.0.0.apk"
                download="muve-qr-v1.0.0.apk"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-[#D4FC04] hover:bg-[#bce003] text-black font-black text-lg transition shadow-xl shadow-[#D4FC04]/25 group"
              >
                <Download className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
                Download Android APK (.apk)
              </a>

              {/* Instant Web App / PWA Option */}
              <button
                type="button"
                onClick={handlePwaInstall}
                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-base transition"
              >
                <Smartphone className="w-5 h-5 text-[#D4FC04]" />
                {installed ? '✓ App Installed on Device' : 'Install Instant PWA (No File Download)'}
              </button>
            </div>

            {/* Quick specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-400 block mb-1">Android OS</span>
                <span className="font-semibold text-white">8.0 (Oreo) or newer</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-400 block mb-1">Hardware</span>
                <span className="font-semibold text-white">Camera + GPS</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-zinc-400 block mb-1">Security</span>
                <span className="font-semibold text-white">TLS 1.3 Encrypted</span>
              </div>
            </div>
          </div>

          {/* Right Column: Scan with Phone QR Card */}
          <div className="lg:col-span-5 bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl text-center flex flex-col items-center justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4FC04] uppercase tracking-wider mb-2">
              <QrCode className="w-4 h-4" />
              Scan with your Mobile Phone
            </div>
            <h4 className="text-xl font-bold mb-2">Open Directly on Android</h4>
            <p className="text-xs text-zinc-400 max-w-xs mb-6">
              Scan this QR code with your phone camera or QR scanner to open this download page directly on your mobile device.
            </p>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl shadow-xl mb-4">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Scan to Download MUVE QR APK" 
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-black">
                  Loading QR...
                </div>
              )}
            </div>

            <span className="text-[11px] font-mono text-zinc-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
              http://localhost:3002/download
            </span>
          </div>
        </div>

        {/* Step-by-Step Installation Instructions */}
        <div className="mt-8 bg-white/[0.02] border border-white/10 rounded-3xl p-8 sm:p-10">
          <h3 className="text-2xl font-bold mb-8 text-center sm:text-left flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#D4FC04]" />
            How to Install the APK on your Android Phone
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-black/30 border border-white/5 relative">
              <div className="w-9 h-9 rounded-full bg-[#D4FC04] text-black font-black flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h4 className="text-base font-bold mb-2">Download File</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tap the <strong>Download Android APK</strong> button above. When Chrome prompts <em>"File might be harmful"</em>, tap <strong>Download anyway</strong>.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-black/30 border border-white/5 relative">
              <div className="w-9 h-9 rounded-full bg-[#D4FC04] text-black font-black flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h4 className="text-base font-bold mb-2">Allow Unknown Sources</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Open the downloaded file. If prompted with <em>"Install unknown apps"</em>, toggle <strong>Allow from this source</strong> for your browser.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-black/30 border border-white/5 relative">
              <div className="w-9 h-9 rounded-full bg-[#D4FC04] text-black font-black flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h4 className="text-base font-bold mb-2">Install & Launch</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tap <strong>Install</strong>. Once completed, tap <strong>Open</strong> to sign in and start tracking activities and scanning QR codes!
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
            <div>
              <strong>Quick Tip:</strong> You can also install MUVE QR as a Progressive Web App (PWA) directly through Google Chrome by tapping the menu icon (<strong>⋮</strong>) &rarr; <strong>Add to Home screen</strong>. It provides full-screen camera scanning without needing to download any file.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500 relative z-10">
        <p>© {new Date().getFullYear()} MUVE QR. Enterprise Activity, Attendance & Location Tracking Platform.</p>
      </footer>
    </div>
  )
}
