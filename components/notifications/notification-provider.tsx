'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AppNotification = {
  id: string
  type: string
  category: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export type NotificationPreferences = {
  inAppEnabled: boolean
  emailEnabled: boolean
  applications: boolean
  experiences: boolean
  internships: boolean
  announcements: boolean
  questions: boolean
  account: boolean
}

const defaultPreferences: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  applications: true,
  experiences: true,
  internships: true,
  announcements: true,
  questions: true,
  account: true,
}

type NotificationContextValue = {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  dismiss: (id: string) => Promise<void>
  preferences: NotificationPreferences
  preferencesLoading: boolean
  savePreferences: (next: NotificationPreferences) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error ?? 'Notification request failed.')
  return result
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [preferencesLoading, setPreferencesLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=5', { cache: 'no-store' })
      const result = await readResponse(response) as { notifications: AppNotification[]; unreadCount: number }
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notification-preferences', { cache: 'no-store' })
      const result = await readResponse(response) as { preferences: NotificationPreferences }
      setPreferences(result.preferences)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load notification preferences.')
    } finally {
      setPreferencesLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    void loadPreferences()
    const interval = window.setInterval(() => { void refresh() }, 45_000)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadPreferences, refresh])

  const markRead = useCallback(async (id: string) => {
    await readResponse(await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }))
    await refresh()
  }, [refresh])

  const markAllRead = useCallback(async () => {
    await readResponse(await fetch('/api/notifications/read-all', { method: 'POST' }))
    await refresh()
  }, [refresh])

  const dismiss = useCallback(async (id: string) => {
    await readResponse(await fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }))
    await refresh()
  }, [refresh])

  const savePreferences = useCallback(async (next: NotificationPreferences) => {
    const response = await fetch('/api/notification-preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    })
    const result = await readResponse(response) as { preferences: NotificationPreferences }
    setPreferences(result.preferences)
  }, [])

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    dismiss,
    preferences,
    preferencesLoading,
    savePreferences,
  }), [notifications, unreadCount, loading, error, refresh, markRead, markAllRead, dismiss, preferences, preferencesLoading, savePreferences])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider')
  return context
}
