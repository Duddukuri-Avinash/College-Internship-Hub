'use client'

import { useEffect, useState } from 'react'
import { Bell, BriefcaseBusiness, CheckCheck, ChevronDown, CircleHelp, FileCheck2, Megaphone, Trash2, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader, Panel } from '@/components/shared'
import { useNotifications, type AppNotification } from '@/components/notifications/notification-provider'
import type { View } from '@/components/app-shell'

const icons: Record<string, typeof Bell> = {
  announcement: Megaphone,
  application: BriefcaseBusiness,
  experience: FileCheck2,
  internship: BriefcaseBusiness,
  question: CircleHelp,
  account: UserRound,
  verification: FileCheck2,
}

export function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString()
}

export function NotificationRow({ notification, onOpen, onDismiss }: {
  notification: AppNotification
  onOpen: (notification: AppNotification) => void
  onDismiss?: (id: string) => void
}) {
  const Icon = icons[notification.type] ?? Bell
  return (
    <li className={`flex gap-3 rounded-lg px-3 py-3 ${notification.isRead ? 'bg-card' : 'bg-accent/50'}`}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary"><Icon className="size-4" aria-hidden="true" /></span>
      <button type="button" onClick={() => onOpen(notification)} className="min-w-0 flex-1 text-left">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{notification.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.message}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{relativeTime(notification.createdAt)}</span>
          </span>
          {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
        </span>
      </button>
      {onDismiss && (
        <button type="button" onClick={() => onDismiss(notification.id)} aria-label="Dismiss notification" className="self-start rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  )
}

export function NotificationsPage({ navigate }: { navigate: (view: View) => void }) {
  const { markRead, dismiss, markAllRead } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<AppNotification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  async function load(reset: boolean, requestedCursor?: string | null) {
    if (reset) {
      setLoading(true)
      setCursor(null)
    } else {
      setLoadingMore(true)
    }
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (filter === 'unread') params.set('unread', 'true')
      const currentCursor = reset ? null : requestedCursor === undefined ? cursor : requestedCursor
      if (currentCursor) params.set('cursor', currentCursor)
      const response = await fetch(`/api/notifications?${params}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not load notifications.')
      setItems((current) => reset ? result.notifications : [...current, ...result.notifications])
      setNextCursor(result.nextCursor)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load notifications.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { void load(true) }, [filter])

  async function open(notification: AppNotification) {
    try {
      if (!notification.isRead) await markRead(notification.id)
      if (notification.link && /^https?:\/\//i.test(notification.link)) {
        window.open(notification.link, '_blank', 'noopener,noreferrer')
      } else if (notification.link === '/notifications') {
        navigate({ name: 'notifications' })
      } else if (notification.link?.startsWith('/')) {
        window.location.assign(notification.link)
      }
      await load(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open notification.')
    }
  }

  async function readAll() {
    try {
      await markAllRead()
      await load(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.')
    }
  }

  async function remove(id: string) {
    try {
      await dismiss(id)
      await load(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not dismiss notification.')
    }
  }

  return (
    <>
      <PageHeader title="Notifications" description="Updates and announcements for your account." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="group" aria-label="Filter notifications">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
            <Button size="sm" variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')}>Unread</Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => { void readAll() }}><CheckCheck /> Mark all as read</Button>
        </div>
        {error && <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading notifications…</p>
          : items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
            : <ul className="flex flex-col gap-2">{items.map((notification) => <NotificationRow key={notification.id} notification={notification} onOpen={(item) => { void open(item) }} onDismiss={(id) => { void remove(id) }} />)}</ul>}
        {!loading && nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" disabled={loadingMore} onClick={() => { setCursor(nextCursor); void load(false, nextCursor) }}>
              {loadingMore ? 'Loading…' : 'Load more'} <ChevronDown />
            </Button>
          </div>
        )}
        {!loading && !error && <div className="sr-only" aria-live="polite">{items.length} notifications loaded</div>}
      </Panel>
    </>
  )
}
