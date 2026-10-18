import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_QR_CODES } from '@/lib/demo-store'
import backupQRCodes from '@/lib/initial-qr-codes.json'
import { QRCodeRow } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = (searchParams.get('token') || '').trim()

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let matchedQR: QRCodeRow | null = null

    if (isSupabaseConfigured) {
      // 1. Try matching exact token
      const { data: d1 } = await (supabaseAdmin as any)
        .from('qr_codes')
        .select('id, name, token, location_name, description, status')
        .eq('token', token)
        .maybeSingle()

      if (d1) matchedQR = d1

      // 2. Try clean token if contains slashes
      if (!matchedQR && token.includes('/')) {
        const clean = token.split('/').pop()?.split('?')[0]?.trim() || ''
        const { data: d2 } = await (supabaseAdmin as any)
          .from('qr_codes')
          .select('id, name, token, location_name, description, status')
          .eq('token', clean)
          .maybeSingle()
        if (d2) matchedQR = d2
      }
    }

    // Fallback search in backup / demo store
    if (!matchedQR) {
      const allQrs = [...(backupQRCodes as QRCodeRow[]), ...INITIAL_QR_CODES]
      matchedQR =
        allQrs.find(
          (q) =>
            q.token === token ||
            (token.includes('/') && q.token === token.split('/').pop()?.split('?')[0]?.trim()) ||
            q.id === token
        ) || null
    }

    if (!matchedQR) {
      return NextResponse.json(
        {
          success: false,
          message: 'Checkpoint QR code not found in directory',
        },
        { status: 404 }
      )
    }

    // Parse floor / zone for friendly display
    const loc = matchedQR.location_name || matchedQR.name || 'Checkpoint'
    const floor = loc.includes('-')
      ? loc.split('-')[0].trim()
      : loc.includes('/')
      ? loc.split('/')[0].trim()
      : 'Main Building'

    return NextResponse.json({
      success: true,
      checkpoint: {
        id: matchedQR.id,
        name: matchedQR.name,
        location_name: matchedQR.location_name,
        description: matchedQR.description || 'Verified Facility Checkpoint',
        floor,
        token: matchedQR.token,
        status: matchedQR.status || 'active',
        org_name: 'MUVE Facility & Security Management',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
