import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_QR_CODES, INITIAL_SCANS, INITIAL_SETTINGS, INITIAL_USERS, INITIAL_NOTIFICATIONS } from '@/lib/demo-store'
import { QRCodeRow, ScanLogRow, ScanStatus } from '@/types/database'
import { nanoid } from 'nanoid'

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { qrToken, latitude, longitude, deviceInfo, userId: reqUserId } = body

    if (!qrToken) {
      return NextResponse.json({ success: false, message: 'QR token is required' }, { status: 400 })
    }

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    let targetQR: QRCodeRow | null = null
    let currentUserId = reqUserId || 'usr_user_001'
    let currentUserName = 'User 01'
    let cooldownMinutes = 5
    let isGpsRequired = false

    if (isSupabaseConfigured) {
      const { data: qrData, error: qrErr } = await (supabaseAdmin as any)
        .from('qr_codes')
        .select('*')
        .eq('token', qrToken)
        .single()

      if (!qrErr && qrData) {
        targetQR = qrData
      }

      const { data: settingsData } = await (supabaseAdmin as any).from('settings').select('*')
      if (settingsData) {
        const cdSetting = settingsData.find((s: any) => s.key === 'duplicate_scan_cooldown')
        if (cdSetting?.value) cooldownMinutes = parseInt(cdSetting.value, 10) || 0
        const gpsSetting = settingsData.find((s: any) => s.key === 'gps_verification_enabled')
        if (gpsSetting?.value) isGpsRequired = gpsSetting.value === 'true'
      }

      const { data: userData } = await (supabaseAdmin as any)
        .from('users')
        .select('full_name, status')
        .eq('id', currentUserId)
        .single()

      if (userData) {
        if (userData.status !== 'active') {
          return NextResponse.json(
            { success: false, message: `Account is ${userData.status}. Scanning disabled.` },
            { status: 403 }
          )
        }
        currentUserName = userData.full_name
      }
    } else {
      targetQR = INITIAL_QR_CODES.find((q) => q.token === qrToken) || null
      if (!targetQR) {
        targetQR = INITIAL_QR_CODES.find((q) => qrToken.includes(q.token) || q.token.includes(qrToken)) || null
      }
      cooldownMinutes = parseInt(INITIAL_SETTINGS.duplicate_scan_cooldown, 10) || 0
      isGpsRequired = INITIAL_SETTINGS.gps_verification_enabled === 'true'

      const user = INITIAL_USERS.find((u) => u.id === currentUserId)
      if (user) {
        if (user.status !== 'active') {
          return NextResponse.json(
            { success: false, message: `Account is ${user.status}. Scanning disabled.` },
            { status: 403 }
          )
        }
        currentUserName = user.full_name
      }
    }

    // MANDATORY NULL CHECK
    if (!targetQR) {
      return NextResponse.json(
        { success: false, message: 'Invalid QR Code. Token not recognized.' },
        { status: 404 }
      )
    }

    const qr: QRCodeRow = targetQR

    if (qr.status === 'inactive') {
      return NextResponse.json(
        { success: false, message: 'This QR code is currently inactive.' },
        { status: 400 }
      )
    }
    if (qr.status === 'archived') {
      return NextResponse.json(
        { success: false, message: 'This QR code has been archived and disabled.' },
        { status: 400 }
      )
    }

    if (qr.latitude !== null && qr.longitude !== null && qr.geofence_radius) {
      if (latitude === undefined || longitude === undefined) {
        if (isGpsRequired) {
          return NextResponse.json(
            { success: false, message: 'GPS location is required for this QR code.' },
            { status: 400 }
          )
        }
      } else {
        const dist = getDistanceMeters(
          latitude,
          longitude,
          qr.latitude,
          qr.longitude
        )
        if (dist > qr.geofence_radius) {
          return NextResponse.json(
            {
              success: false,
              message: `You are outside the permitted scanning area. (${Math.round(dist)}m away, limit ${qr.geofence_radius}m)`,
            },
            { status: 400 }
          )
        }
      }
    }

    if (cooldownMinutes > 0) {
      const cooldownMs = cooldownMinutes * 60 * 1000
      const cutoffTime = new Date(Date.now() - cooldownMs).toISOString()

      let recentScan = false
      if (isSupabaseConfigured) {
        const { data: existingScans } = await (supabaseAdmin as any)
          .from('scan_logs')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('qr_id', qr.id)
          .eq('status', 'success')
          .gte('scanned_at', cutoffTime)
          .limit(1)

        recentScan = !!(existingScans && existingScans.length > 0)
      } else {
        recentScan = INITIAL_SCANS.some(
          (s) =>
            s.user_id === currentUserId &&
            s.qr_id === qr.id &&
            s.status === 'success' &&
            new Date(s.scanned_at).getTime() >= new Date(cutoffTime).getTime()
        )
      }

      if (recentScan) {
        return NextResponse.json(
          {
            success: false,
            message: `You have already scanned this QR code recently. Cooldown is ${cooldownMinutes} min.`,
          },
          { status: 429 }
        )
      }
    }

    const scanTimestamp = new Date().toISOString()
    const scanId = `scan_${nanoid(12)}`
    const newScanRecord: ScanLogRow = {
      id: scanId,
      user_id: currentUserId,
      qr_id: qr.id,
      qr_token: qr.token,
      qr_name: qr.name,
      location_name: qr.location_name,
      status: 'success' as ScanStatus,
      rejection_reason: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      device_info: deviceInfo || 'Mobile Device / MUVE App',
      scanned_at: scanTimestamp,
      created_at: scanTimestamp,
    }

    if (isSupabaseConfigured) {
      const { error: insertErr } = await (supabaseAdmin as any)
        .from('scan_logs')
        .insert(newScanRecord)

      if (insertErr) {
        console.error('Supabase scan insert error:', insertErr)
        return NextResponse.json(
          { success: false, message: 'Failed to save scan record' },
          { status: 500 }
        )
      }

      await (supabaseAdmin as any).from('notifications').insert({
        type: 'scan',
        title: 'New Scan Recorded',
        message: `${currentUserName} scanned ${qr.name} (${qr.location_name})`,
        scan_id: scanId,
        is_read: false,
      })
    } else {
      INITIAL_SCANS.unshift(newScanRecord)
      INITIAL_NOTIFICATIONS.unshift({
        id: `notif_${nanoid(8)}`,
        type: 'scan',
        title: 'New Scan Recorded',
        message: `${currentUserName} scanned ${qr.name} (${qr.location_name})`,
        scan_id: scanId,
        is_read: false,
        created_at: scanTimestamp,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Scan successful',
      scan: {
        id: scanId,
        user: currentUserName,
        qr: qr.name,
        location: qr.location_name,
        timestamp: scanTimestamp,
        status: 'success',
      },
    })
  } catch (err: any) {
    console.error('Scan API handler error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
