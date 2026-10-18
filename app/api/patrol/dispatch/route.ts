import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { INITIAL_USERS, INITIAL_SETTINGS } from '@/lib/demo-store'
import backupQRCodes from '@/lib/initial-qr-codes.json'
import { QRCodeRow, UserRow, TodoRow } from '@/types/database'
import { getAllTodosFromStore, addTodoToStore } from '@/lib/todos-store'
import { sendPushToAllStaff } from '@/lib/web-push-sender'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to convert time string (e.g. "08:00") to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = (timeStr || '08:00').split(':').map(Number)
  return (isNaN(hours) ? 8 : hours) * 60 + (isNaN(minutes) ? 0 : minutes)
}

// Helper to get current minutes from midnight in a given timezone (e.g. Asia/Colombo)
function getCurrentTimeInTimezone(timezone = 'Asia/Colombo'): { minutes: number; timeString: string; dateString: string } {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '8', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
    const year = parts.find((p) => p.type === 'year')?.value || '2026'
    const month = parts.find((p) => p.type === 'month')?.value || '01'
    const day = parts.find((p) => p.type === 'day')?.value || '01'

    return {
      minutes: hour * 60 + minute,
      timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      dateString: `${year}-${month}-${day}`,
    }
  } catch (e) {
    const d = new Date()
    return {
      minutes: d.getHours() * 60 + d.getMinutes(),
      timeString: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      dateString: d.toISOString().split('T')[0],
    }
  }
}

export async function GET(req: NextRequest) {
  return handleDispatch(req)
}

export async function POST(req: NextRequest) {
  return handleDispatch(req)
}

async function handleDispatch(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === 'true'
    const requestedUserId = searchParams.get('userId')

    const isSupabaseConfigured =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

    // 1. Fetch system settings
    let settingsObj: Record<string, string> = {}
    if (isSupabaseConfigured) {
      try {
        const { data: sData } = await (supabaseAdmin as any).from('settings').select('*')
        if (sData) {
          sData.forEach((item: any) => {
            settingsObj[item.key] = item.value || ''
          })
        }
      } catch (e) {}
    } else {
      settingsObj = { ...INITIAL_SETTINGS } as any
    }

    const shiftStartTime = settingsObj.shift_start_time || '08:00'
    const shiftEndTime = settingsObj.shift_end_time || '20:00'
    const scansPerHour = parseInt(settingsObj.scans_per_hour || '4', 10) || 4
    const isPatrolEnabled = settingsObj.random_patrol_enabled !== 'false'
    const timezone = settingsObj.timezone || 'Asia/Colombo'

    if (!isPatrolEnabled && !force) {
      return NextResponse.json({
        success: true,
        message: 'Automated patrol dispatch is currently disabled in Platform Settings.',
        dispatched: 0,
      })
    }

    // 2. Shift window evaluation
    const currentTzTime = getCurrentTimeInTimezone(timezone)
    const startMin = timeToMinutes(shiftStartTime)
    const endMin = timeToMinutes(shiftEndTime)
    const isWithinShift =
      startMin <= endMin
        ? currentTzTime.minutes >= startMin && currentTzTime.minutes <= endMin
        : currentTzTime.minutes >= startMin || currentTzTime.minutes <= endMin // Overnight shift support

    if (!isWithinShift && !force) {
      return NextResponse.json({
        success: true,
        message: `Current time (${currentTzTime.timeString}) is outside office shift (${shiftStartTime} - ${shiftEndTime}).`,
        isWithinShift: false,
        dispatched: 0,
      })
    }

    // 3. Fetch active staff users
    let activeUsers: UserRow[] = []
    if (isSupabaseConfigured) {
      try {
        const { data: uData } = await (supabaseAdmin as any)
          .from('users')
          .select('*')
          .eq('role', 'user')
          .eq('status', 'active')
        activeUsers = (uData || []) as UserRow[]
      } catch (e) {}
    }

    if (activeUsers.length === 0) {
      activeUsers = INITIAL_USERS.filter((u) => u.role === 'user' && u.status === 'active')
    }

    if (requestedUserId) {
      activeUsers = activeUsers.filter(
        (u) =>
          u.id === requestedUserId ||
          ((requestedUserId === 'usr_user_001' || requestedUserId === '00000000-0000-0000-0000-000000000002') &&
            (u.id === 'usr_user_001' || u.id === '00000000-0000-0000-0000-000000000002'))
      )
    }

    if (activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active staff users available for patrol assignment.',
        dispatched: 0,
      })
    }

    // 4. Fetch all available checkpoints (53 office QR codes)
    let allQRCodes: QRCodeRow[] = []
    if (isSupabaseConfigured) {
      try {
        const { data: qrData } = await (supabaseAdmin as any)
          .from('qr_codes')
          .select('*')
          .neq('status', 'archived')
        allQRCodes = (qrData && qrData.length > 0 ? qrData : backupQRCodes) as QRCodeRow[]
      } catch (e) {}
    }

    if (allQRCodes.length === 0) {
      allQRCodes = (backupQRCodes || []) as QRCodeRow[]
    }

    if (allQRCodes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No QR checkpoints configured in system.',
        dispatched: 0,
      }, { status: 400 })
    }

    // 5. Fetch existing todos to evaluate user's task history today
    const allTodos = await getAllTodosFromStore()
    const nowMs = Date.now()
    const oneHourAgoMs = nowMs - 60 * 60 * 1000
    const startOfDayMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime()

    // Minimum spacing interval between dispatches (in ms)
    // For 4 scans/hour, target is 15 mins; minimum allowed gap is ~9 mins (unless force=true)
    const minSpacingMs = force ? 0 : Math.max(5, Math.floor((60 / scansPerHour) * 0.6)) * 60 * 1000

    const dispatchResults: Array<{ userId: string; userName: string; qrName: string; qrLocation: string }> = []

    for (const staff of activeUsers) {
      // Normalize user id matching
      const userTodos = allTodos.filter(
        (t) =>
          t.user_id === staff.id ||
          ((staff.id === 'usr_user_001' || staff.id === '00000000-0000-0000-0000-000000000002') &&
            (t.user_id === 'usr_user_001' || t.user_id === '00000000-0000-0000-0000-000000000002'))
      )

      // Patrol tasks created for this user in the past 60 minutes
      const pastHourPatrolTasks = userTodos.filter(
        (t) =>
          t.assigned_by === 'Automated Patrol Dispatch' &&
          new Date(t.created_at).getTime() >= oneHourAgoMs
      )

      // Latest patrol task timestamp
      const latestPatrolTask = userTodos
        .filter((t) => t.assigned_by === 'Automated Patrol Dispatch')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      const timeSinceLastMs = latestPatrolTask ? nowMs - new Date(latestPatrolTask.created_at).getTime() : Infinity

      // Condition: User has not reached scansPerHour for the current hour AND enough time has elapsed
      if (!force) {
        if (pastHourPatrolTasks.length >= scansPerHour) {
          continue // Staff already received their quota for this hour
        }
        if (timeSinceLastMs < minSpacingMs) {
          continue // Too soon since the previous assignment
        }
      }

      // Check which checkpoints this staff member was already assigned today
      const assignedQrTokensToday = new Set(
        userTodos
          .filter((t) => new Date(t.created_at).getTime() >= startOfDayMs && t.admin_notes?.includes('Target QR:'))
          .map((t) => (t.admin_notes || '').replace('Target QR:', '').trim())
      )

      // Filter available checkpoints that have NOT been assigned to this user today
      let candidateQRs = allQRCodes.filter((qr) => !assignedQrTokensToday.has(qr.token))

      // If staff has covered all 53 checkpoints today, reset pool to all checkpoints
      if (candidateQRs.length === 0) {
        candidateQRs = [...allQRCodes]
      }

      // Pick a random checkpoint from the candidate pool
      const randomIndex = Math.floor(Math.random() * candidateQRs.length)
      const chosenQR = candidateQRs[randomIndex]

      const taskId = `todo_patrol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const newTodo: TodoRow = {
        id: taskId,
        user_id: staff.id,
        user_name: staff.full_name,
        user_phone: staff.phone || '077 111 1111',
        title: `📍 Checkpoint: ${chosenQR.name}`,
        description: `Office Patrol: Please proceed to ${chosenQR.location_name} and scan the QR code.`,
        priority: 'high',
        status: 'pending',
        assigned_by: 'Automated Patrol Dispatch',
        admin_reviewed: false,
        admin_notes: `Target QR: ${chosenQR.token}`,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await addTodoToStore(newTodo)

      // Send targeted lock-screen Web Push notification exclusively to this user
      try {
        await sendPushToAllStaff(
          {
            title: `MUVE QR - Checkpoint Assigned`,
            body: `Please scan: ${chosenQR.location_name}`,
            url: `/app/scan?target=${encodeURIComponent(chosenQR.token)}`,
            tag: `muve-patrol-${staff.id}-${Date.now()}`,
            priority: 'high',
            targetUserId: staff.id,
          },
          staff.id
        )
      } catch (pushErr) {
        console.warn(`[PatrolDispatch] Web Push error for ${staff.full_name}:`, pushErr)
      }

      dispatchResults.push({
        userId: staff.id,
        userName: staff.full_name,
        qrName: chosenQR.name,
        qrLocation: chosenQR.location_name,
      })
    }

    return NextResponse.json({
      success: true,
      message:
        dispatchResults.length > 0
          ? `Dispatched ${dispatchResults.length} random patrol checkpoint(s) across active staff.`
          : 'All staff are currently up to date on their hourly patrol quota.',
      dispatched: dispatchResults.length,
      assignments: dispatchResults,
      shiftInfo: {
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        currentTime: currentTzTime.timeString,
        timezone,
        isWithinShift,
      },
    })
  } catch (err: any) {
    console.error('[PatrolDispatch] Handler error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
