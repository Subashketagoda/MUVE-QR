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
      try {
        const { data, error } = await (supabaseAdmin as any)
          .from('qr_codes')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, qrCodes: data })
        }
      } catch (sbErr) {
        console.warn('Supabase qr_codes fetch error, using fallback:', sbErr)
      }
    }

    return NextResponse.json({ success: true, qrCodes: INITIAL_QR_CODES })
  } catch (err: any) {
    return NextResponse.json({ success: true, qrCodes: INITIAL_QR_CODES })
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
    const now = new Date().toISOString()
    const adminUuid = '00000000-0000-0000-0000-000000000001'
    const qrUuid = crypto.randomUUID()

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any)
        .from('qr_codes')
        .insert({
          id: qrUuid,
          name,
          token,
          location_name,
          description: description || null,
          status: status as 'active' | 'inactive' | 'archived',
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          geofence_radius: geofence_radius ? parseInt(geofence_radius, 10) : null,
          created_by: adminUuid,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw error

      try {
        await (supabaseAdmin as any).from('audit_logs').insert({
          admin_id: adminUuid,
          admin_name: 'System Admin',
          action: 'qr_created',
          target_type: 'qr_code',
          target_id: data.id,
          target_name: name,
          details: { location: location_name, token },
        })
      } catch (auditErr) {
        console.warn('Audit log skip:', auditErr)
      }

      return NextResponse.json({ success: true, qrCode: data })
    }

    const newQR: QRCodeRow = {
      id: `qr_${nanoid(10)}`,
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
