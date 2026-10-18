import React from 'react'
import { PublicCheckpointForm } from '@/components/public/PublicCheckpointForm'
import Link from 'next/link'
import { QrCode, ArrowRight, ShieldAlert } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

interface ScanPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const { token } = await searchParams

  if (token) {
    return <PublicCheckpointForm token={token} />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      <div className="w-full max-w-md mx-auto space-y-6 pt-12 text-center">
        <Logo size="md" showSubtitle={true} subtitleText="CHECKPOINT VERIFIER" />

        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#D4FC04] text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-[#D4FC04]/20 font-black">
            <QrCode className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black">Scan Facility QR Code</h1>
            <p className="text-xs text-slate-400 mt-2">
              Please point your smartphone camera directly at any MUVE QR checkpoint sticker mounted on the wall or door.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-3">Are you an authorized security officer?</p>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-white"
            >
              <span>Security Officer Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 pb-4">
        MUVE QR Facility & Operations System
      </footer>
    </div>
  )
}
