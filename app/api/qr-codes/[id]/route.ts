import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_QR_CODES, INITIAL_AUDIT_LOGS } from '@/lib/demo-store'
import { nanoid } from 'nanoid'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, location_name, description, status, latitude, longitude, geofence_radius } = body

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updatePayload.name = name
    if (location_name !== undefined) updatePayload.location_name = location_name
    if (description !== undefined) updatePayload.description = description
    if (status !== undefined) updatePayload.status = status
    if (latitude !== undefined) updatePayload.latitude = latitude ? parseFloat(latitude) : null
    if (longitude !== undefined) updatePayload.longitude = longitude ? parseFloat(longitude) : null
    if (geofence_radius !== undefined) updatePayload.geofence_radius = geofence_radius ? parseInt(geofence_radius, 10) : null

    if (isSupabaseConfigured) {
      const { data, error } = await (supabaseAdmin as any)
        .from('qr_codes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      try {
        await (supabaseAdmin as any).from('audit_logs').insert({
          admin_id: '00000000-0000-0000-0000-000000000001',
          admin_name: 'System Admin',
          action: status ? `qr_${status}` : 'qr_edited',
          target_type: 'qr_code',
          target_id: id,
          target_name: data.name,
          details: updatePayload,
        })
      } catch (e) {}

      return NextResponse.json({ success: true, qrCode: data })
    }

    // Demo Store
    const index = INITIAL_QR_CODES.findIndex((q) => q.id === id)
    if (index === -1) {
      return NextResponse.json({ success: false, message: 'QR Code not found' }, { status: 404 })
    }

    INITIAL_QR_CODES[index] = { ...INITIAL_QR_CODES[index], ...updatePayload }
    const updated = INITIAL_QR_CODES[index]

    INITIAL_AUDIT_LOGS.unshift({
      id: `audit_${nanoid(8)}`,
      admin_id: 'usr_admin_001',
      admin_name: 'System Admin',
      action: status ? `qr_${status}` : 'qr_edited',
      target_type: 'qr_code',
      target_id: id,
      target_name: updated.name,
      details: updatePayload,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, qrCode: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    if (isSupabaseConfigured) {
      const { error } = await (supabaseAdmin as any).from('qr_codes').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'QR Code deleted' })
    }

    const index = INITIAL_QR_CODES.findIndex((q) => q.id === id)
    if (index !== -1) {
      INITIAL_QR_CODES.splice(index, 1)
    }
    return NextResponse.json({ success: true, message: 'QR Code deleted' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
