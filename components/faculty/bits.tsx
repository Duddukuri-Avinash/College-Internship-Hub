'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TODAY } from '@/lib/faculty-data'

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'orange'

const tones: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/20 bg-accent text-primary',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning-foreground',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  orange: 'border-orange-300 bg-orange-50 text-orange-700',
}

export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary [&_svg]:size-5" aria-hidden="true">{icon}</span>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label, counts }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string; counts?: Partial<Record<T, number>> }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
            value === o ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {o}
          {counts?.[o] !== undefined && <span className="ml-1.5 tabular-nums opacity-75">{counts[o]}</span>}
        </button>
      ))}
    </div>
  )
}

export const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const daysUntil = (d: string) => Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(`${TODAY}T00:00:00`).getTime()) / 86_400_000)

export const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p) && !p.endsWith('.'))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || name[0]

export const th = 'px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground'
export const td = 'px-3 py-3 align-middle'
