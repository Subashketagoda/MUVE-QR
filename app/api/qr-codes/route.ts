import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_QR_CODES, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { QRCodeRow } from '@/types/database'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  try {
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any)
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, qrCodes: data })
    }

    return NextResponse.json({ success: true, qrCodes: INITIAL_QR_CODES })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, location_name, description, status = 'active', latitude, longitude, geofence_radius } = body

    if (!name || !location_name) {
      return NextResponse.json(
        { success: false, message: 'QR Name and Location Name are required' },
        { status: 400 }
      )
    }

    const sanitizeLoc = location_name.replace(/[^a-zA-Z0-9]/g, '')
    const token = `MUVEQR-${sanitizeLoc}-${nanoid(16)}`
    const qrId = `qr_${nanoid(10)}`
    const now = new Date().toISOString()

    const newQR: QRCodeRow = {
      id: qrId,
      name,
      token,
      location_name,
      description: description || null,
      status: status as 'active' | 'inactive' | 'archived',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      geofence_radius: geofence_radius ? parseInt(geofence_radius, 10) : null,
      created_by: 'usr_admin_001',
      created_at: now,
      updated_at: now,
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any).from('qr_codes').insert(newQR).select().single()
      if (error) throw error

      await (supabaseAdmin as any).from('audit_logs').insert({
        admin_name: 'System Admin',
        action: 'qr_created',
        target_type: 'qr_code',
        target_id: data.id,
        target_name: name,
        details: { location: location_name, token },
      })

      return NextResponse.json({ success: true, qrCode: data })
    }

    INITIAL_QR_CODES.unshift(newQR)
    INITIAL_AUDIT_LOGS.unshift({
      id: `audit_${nanoid(8)}`,
      admin_id: 'usr_admin_001',
      admin_name: 'System Admin',
      action: 'qr_created',
      target_type: 'qr_code',
      target_id: qrId,
      target_name: name,
      details: { location: location_name, token },
      ip_address: '127.0.0.1',
      created_at: now,
    })

    return NextResponse.json({ success: true, qrCode: newQR })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
