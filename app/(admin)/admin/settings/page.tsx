'use client'

import React, { useEffect, useState } from 'react'
import { Save, Building, Clock, ShieldCheck, MapPin, Bell, Globe } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    org_name: 'MUVE QR Corp',
    timezone: 'UTC',
    date_format: 'DD/MM/YYYY',
    duplicate_scan_cooldown: '5',
    gps_verification_enabled: 'false',
    notification_sound_enabled: 'true',
    logo_url: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()
      if (json.success && json.settings) {
        setSettings((prev) => ({ ...prev, ...json.settings }))
      }
    } catch (e) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Organization settings saved successfully')
      } else {
        toast.error(json.message || 'Failed to save')
      }
    } catch (e) {
      toast.error('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 skeleton" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 text-sm">
          Configure organization rules, scan cooldowns, location requirements, and system defaults
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: General Info */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Organization Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Organization / Company Name</label>
              <input
                type="text"
                required
                value={settings.org_name}
                onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Custom Logo Image URL</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">System Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="form-input form-select"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Display Date Format</label>
              <select
                value={settings.date_format}
                onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                className="form-input form-select"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (22/01/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (01/22/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-22)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Scan Cooldown & Protection */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Duplicate Scan Protection</h3>
          </div>

          <div>
            <label className="form-label">Duplicate Scan Cooldown Period</label>
            <p className="text-xs text-slate-500 mb-2">
              Prevents users from spam scanning the same QR code repeatedly within this time frame.
            </p>
            <select
              value={settings.duplicate_scan_cooldown}
              onChange={(e) => setSettings({ ...settings, duplicate_scan_cooldown: e.target.value })}
              className="form-input form-select max-w-sm"
            >
              <option value="0">OFF (Disabled — unlimited repeat scans)</option>
              <option value="1">1 Minute</option>
              <option value="5">5 Minutes (Recommended)</option>
              <option value="10">10 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes (1 Hour)</option>
            </select>
          </div>
        </div>

        {/* Section 3: GPS & Notifications */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-base">GPS & Sound Alerts</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Mandatory GPS Verification</p>
                <p className="text-xs text-slate-500">
                  Require GPS coordinate access on mobile device for every scan submission.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.gps_verification_enabled === 'true'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    gps_verification_enabled: e.target.checked ? 'true' : 'false',
                  })
                }
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Live Scan Notification Audio</p>
                <p className="text-xs text-slate-500">
                  Play subtle chime tone when new live scan arrives on Admin dashboard.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.notification_sound_enabled === 'true'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notification_sound_enabled: e.target.checked ? 'true' : 'false',
                  })
                }
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg shadow-lg">
            {saving ? (
              'Saving...'
            ) : (
              <span className="inline-flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Settings
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
