'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Panel } from '@/components/shared'
import { Switch } from '@/components/student/form-bits'
import { useNotifications, type NotificationPreferences } from '@/components/notifications/notification-provider'

const categories: { key: keyof Pick<NotificationPreferences, 'applications' | 'experiences' | 'internships' | 'announcements' | 'questions' | 'account'>; label: string; hint: string }[] = [
  { key: 'applications', label: 'Applications', hint: 'Application submissions and status updates.' },
  { key: 'experiences', label: 'Experiences & verification', hint: 'Experience and document review updates.' },
  { key: 'internships', label: 'Internships', hint: 'New opportunities and self-found internship updates.' },
  { key: 'announcements', label: 'Announcements', hint: 'Faculty and administrator announcements.' },
  { key: 'questions', label: 'Questions', hint: 'Question replies and moderation updates.' },
  { key: 'account', label: 'Account', hint: 'Important account and profile updates.' },
]

export function NotificationPreferencesPanel() {
  const { preferences, preferencesLoading, savePreferences } = useNotifications()
  const [saving, setSaving] = useState(false)

  async function update(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...preferences, [key]: value }
    setSaving(true)
    try {
      await savePreferences(next)
      toast.success('Notification preferences saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save notification preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Notification preferences">
      {preferencesLoading ? (
        <p className="text-sm text-muted-foreground">Loading saved preferences…</p>
      ) : (
        <>
          <ul className="divide-y">
            {categories.map(({ key, label, hint }) => (
              <li key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch label={label} checked={preferences[key]} disabled={saving} onChange={(value) => { void update(key, value) }} />
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t pt-3">
            <p className="mb-3 text-sm font-medium">Delivery channels</p>
            <ul className="divide-y">
              <li className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div><p className="text-sm font-medium">In-app notifications</p><p className="text-xs text-muted-foreground">Shown in the bell and notifications page.</p></div>
                <Switch label="In-app notifications" checked={preferences.inAppEnabled} disabled={saving} onChange={(value) => { void update('inAppEnabled', value) }} />
              </li>
              <li className="flex items-center justify-between gap-4 py-3 last:pb-0">
                <div><p className="text-sm font-medium">Email</p><p className="text-xs text-muted-foreground">Sent to your account email for enabled categories.</p></div>
                <Switch label="Email notifications" checked={preferences.emailEnabled} disabled={saving} onChange={(value) => { void update('emailEnabled', value) }} />
              </li>
            </ul>
          </div>
        </>
      )}
    </Panel>
  )
}
