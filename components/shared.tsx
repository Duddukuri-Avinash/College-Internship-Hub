'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X, FileText, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppStatus, Source, VerifyStatus } from '@/lib/data'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-5 shadow-xs', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatCard({ label, value, hint, icon, progress }: { label: string; value: string | number; hint?: string; icon: ReactNode; progress?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {progress !== undefined && <Bar value={progress} className="mt-3" />}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Bar({ value, className, tone = 'primary' }: { value: number; className?: string; tone?: 'primary' | 'success' | 'warning' }) {
  const color = tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-primary'
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${value}%` }} />
    </div>
  )
}

const pill = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

export function SourceBadge({ source }: { source: Source }) {
  const styles: Record<Source, string> = {
    'College Opportunity': 'border-primary/20 bg-accent text-primary',
    'Self-Found': 'border-border bg-muted text-muted-foreground',
    'Senior Referral': 'border-success/25 bg-success/10 text-success',
  }
  return <span className={cn(pill, styles[source])}>{source}</span>
}

export function VerifyBadge({ status }: { status: VerifyStatus }) {
  const styles: Record<VerifyStatus, string> = {
    Pending: 'border-warning/30 bg-warning/15 text-warning-foreground',
    Verified: 'border-success/25 bg-success/10 text-success',
    Rejected: 'border-destructive/25 bg-destructive/10 text-destructive',
    'Additional Proof Required': 'border-orange-300 bg-orange-50 text-orange-700',
  }
  return <span className={cn(pill, styles[status])}>{status}</span>
}

export function AppStatusBadge({ status }: { status: AppStatus }) {
  const styles: Record<AppStatus, string> = {
    Saved: 'border-border bg-muted text-muted-foreground',
    Applied: 'border-primary/20 bg-accent text-primary',
    Interview: 'border-warning/30 bg-warning/15 text-warning-foreground',
    Selected: 'border-success/25 bg-success/10 text-success',
    Rejected: 'border-destructive/25 bg-destructive/10 text-destructive',
    Withdrawn: 'border-border bg-background text-muted-foreground line-through',
  }
  return <span className={cn(pill, styles[status])}>{status}</span>
}

export function MatchRing({ value }: { value: number }) {
  const tone = value >= 80 ? 'text-success' : value >= 50 ? 'text-warning' : 'text-muted-foreground'
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center" aria-label={`${value}% match`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" className={cn('stroke-current', tone)} strokeWidth="3" strokeDasharray={`${(value / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{children}</span>
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn('m-auto w-[calc(100%-2rem)] rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-foreground/40 backdrop:backdrop-blur-sm', size === 'lg' ? 'max-w-3xl' : 'max-w-lg')}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div>
              <h2 className="font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close dialog">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/40 p-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function FileDrop({ label, hint, fileName, onFile }: { label: string; hint?: string; fileName?: string; onFile: (file: File) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50">
      {fileName ? <FileText className="size-8 text-primary" aria-hidden="true" /> : <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />}
      <span className="text-sm font-medium">{fileName ?? label}</span>
      <span className="text-xs text-muted-foreground">{fileName ? 'Click to replace file' : hint ?? 'PDF, JPG or PNG up to 5 MB'}</span>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  )
}

export function DocPreview({ title, lines }: { title: string; lines: [string, string][] }) {
  return (
    <div className="rounded-lg border bg-background p-5 shadow-inner">
      <div className="mx-auto max-w-md rounded-md border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div className="h-3 w-20 rounded bg-primary/70" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Document preview</span>
        </div>
        <p className="mb-3 text-sm font-semibold">{title}</p>
        <dl className="flex flex-col gap-2 text-xs">
          {lines.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-dashed pb-1.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-11/12 rounded bg-muted" />
          <div className="h-2 w-4/5 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export const selectClass =
  'h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
