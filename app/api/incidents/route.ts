import { NextResponse } from 'next/server'
import { getAllIncidents, createIncident, updateIncidentStatus } from '@/lib/incidents-store'
import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')

    let incidents = await getAllIncidents()

    if (userId) {
      incidents = incidents.filter((i) => i.reported_by_id === userId)
    }

    if (status && status !== 'all') {
      incidents = incidents.filter((i) => i.status === status)
    }

    if (severity && severity !== 'all') {
      incidents = incidents.filter((i) => i.severity === severity)
    }

    return NextResponse.json({
      success: true,
      incidents,
      total: incidents.length,
      unresolvedCount: incidents.filter((i) => i.status !== 'resolved' && i.status !== 'dismissed').length,
    })
  } catch (error: any) {
    console.error('Error fetching incidents:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      category,
      severity,
      location_name,
      description,
      photo_url,
      reported_by_id,
      reported_by_name,
      reported_by_phone,
      latitude,
      longitude,
    } = body

    if (!title || !category || !location_name || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, category, location, and description are required.',
        },
        { status: 400 }
      )
    }

    const newIncident = await createIncident({
      title,
      category: category as IncidentCategory,
      severity: (severity || 'medium') as IncidentSeverity,
      location_name,
      description,
      photo_url: photo_url || null,
      reported_by_id: reported_by_id || 'usr_anonymous',
      reported_by_name: reported_by_name || 'Staff Officer',
      reported_by_phone: reported_by_phone || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    })

    return NextResponse.json({
      success: true,
      message: 'Incident reported successfully and alert broadcasted.',
      incident: newIncident,
    })
  } catch (error: any) {
    console.error('Error reporting incident:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit incident report' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, action_taken, resolved_by } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Incident ID is required.' },
        { status: 400 }
      )
    }

    const updated = await updateIncidentStatus(id, {
      status: status as IncidentStatus | undefined,
      action_taken,
      resolved_by,
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Incident updated successfully.',
      incident: updated,
    })
  } catch (error: any) {
    console.error('Error updating incident:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update incident' },
      { status: 500 }
    )
  }
}
