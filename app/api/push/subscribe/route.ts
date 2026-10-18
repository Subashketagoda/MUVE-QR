import { NextRequest, NextResponse } from 'next/server'
import { VAPID_PUBLIC_KEY, sendPushToAllStaff } from '@/lib/web-push-sender'
import {
  addPushSubscription,
  removePushSubscription,
  getAllPushSubscriptions,
} from '@/lib/push-subscriptions-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const all = await getAllPushSubscriptions()
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
    activeSubscribersCount: all.length,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, userId, userAgent, test } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, message: 'Valid PushSubscription required' },
        { status: 400 }
      )
    }

    const updated = await addPushSubscription({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userId: userId || 'unknown',
      userAgent: userAgent || 'Unknown Device',
      createdAt: new Date().toISOString(),
    })

    // If this is a test registration, send an instant test push to this device
    if (test) {
      setTimeout(async () => {
        try {
          await sendPushToAllStaff({
            title: '✅ Lock Screen Alerts Active!',
            body: 'You will now receive instant audible and lock-screen alerts whenever a visitor reports an issue.',
            url: '/app/tasks',
            tag: 'muve-test-welcome',
          })
        } catch (e) {}
      }, 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully for lock screen alerts.',
      activeCount: updated.length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    if (endpoint) {
      await removePushSubscription(endpoint)
    }
    return NextResponse.json({ success: true, message: 'Unsubscribed' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
