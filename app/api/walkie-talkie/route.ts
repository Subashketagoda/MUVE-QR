import { NextRequest, NextResponse } from 'next/server'
import {
  WALKIE_CHANNELS,
  getTransmissions,
  addTransmission,
  pingOperator,
  getOnlineOperators,
} from '@/lib/walkie-talkie-store'
import { sendPushToAllStaff } from '@/lib/web-push-sender'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channel') || undefined

    const transmissions = await getTransmissions(channelId)
    const operators = getOnlineOperators(channelId)

    return NextResponse.json({
      success: true,
      channels: WALKIE_CHANNELS,
      transmissions,
      operators,
    })
  } catch (error) {
    console.error('[API WalkieTalkie] GET Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch radio traffic' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      channel_id = 'ch_1',
      sender_id = 'usr_anonymous',
      sender_name = 'Staff Guard',
      sender_role = 'user',
      sender_callsign = 'PATROL',
      audio_base64 = null,
      duration_ms = 1000,
      type = 'voice',
      code_text = null,
    } = body

    const channel = WALKIE_CHANNELS.find((c) => c.id === channel_id) || WALKIE_CHANNELS[0]

    const newTx = await addTransmission({
      channel_id,
      channel_name: channel.name,
      sender_id,
      sender_name,
      sender_role,
      sender_callsign,
      audio_base64,
      duration_ms,
      type,
      code_text,
    })

    // If emergency channel transmission, dispatch urgent Push notification to all staff
    if (channel.isEmergency || (code_text && code_text.includes('10-33'))) {
      try {
        sendPushToAllStaff({
          title: `🚨 TACTICAL RADIO ALERT [${channel.code}]`,
          body: `${sender_callsign} (${sender_name}): ${code_text || 'Emergency voice transmission received!'}`,
          url: '/app/walkie-talkie',
        }).catch((e) => console.warn('[WalkieTalkie Push] Error sending emergency push:', e))
      } catch (err) {
        console.warn('Emergency push error:', err)
      }
    }

    return NextResponse.json({
      success: true,
      transmission: newTx,
    })
  } catch (error) {
    console.error('[API WalkieTalkie] POST Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to broadcast transmission' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, role = 'user', callsign = 'PATROL', channel_id = 'ch_1', is_transmitting = false } = body

    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'Missing operator id or name' }, { status: 400 })
    }

    const updatedOperators = pingOperator({
      id,
      name,
      role,
      callsign,
      channel_id,
      is_transmitting,
    })

    return NextResponse.json({
      success: true,
      operators: updatedOperators,
    })
  } catch (error) {
    console.error('[API WalkieTalkie] PUT Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update presence' }, { status: 500 })
  }
}
