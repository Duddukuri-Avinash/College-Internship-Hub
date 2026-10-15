'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/shared'
import { Field } from '@/components/student/form-bits'
import { EmptyState } from '@/components/faculty/bits'
import { cn } from '@/lib/utils'

export function Table({ head, rows, empty }: { head: ReactNode[]; rows: ReactNode[][]; empty?: { icon: ReactNode; title: string; description?: string } }) {
  if (!rows.length && empty) return <EmptyState {...empty} />
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-muted/40">{r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-card pl-9" placeholder={placeholder} aria-label={label} />
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | [string, string])[] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o]
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </label>
  )
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{total} {total === 1 ? 'record' : 'records'}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft /></Button>
        <span className="tabular-nums">Page {page} of {Math.max(1, pages)}</span>
        <Button size="sm" variant="outline" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  )
}

export function Confirm({ open, onClose, title, description, confirmLabel, onConfirm, destructive = true, children }: { open: boolean; onClose: () => void; title: string; description?: string; confirmLabel: string; onConfirm: () => void; destructive?: boolean; children?: ReactNode }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {children ?? <p className="text-sm text-muted-foreground">This action is recorded in the audit log.</p>}
    </Modal>
  )
}

export function ReasonModal({ open, onClose, title, description, label, confirmLabel, onConfirm, destructive }: { open: boolean; onClose: () => void; title: string; description?: string; label: string; confirmLabel: string; onConfirm: (reason: string) => void; destructive?: boolean }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) {
      setReason('')
      setError('')
    }
  }, [open])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => {
              if (reason.trim().length < 5) return setError('Add a short reason (at least 5 characters).')
              onConfirm(reason.trim())
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} htmlFor="reason-text" error={error}>
        <Textarea id="reason-text" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} aria-invalid={!!error || undefined} />
      </Field>
    </Modal>
  )
}

export function Drawer({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
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
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-l bg-card p-0 text-card-foreground shadow-xl backdrop:bg-foreground/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex h-full flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div>
              <h2 className="font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close panel"><X className="size-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, label, counts }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; label: string; counts?: Partial<Record<T, number>> }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
            value === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t}
          {counts?.[t] !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{counts[t]}</span>}
        </button>
      ))}
    </div>
  )
}

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export const linkClass = 'rounded-xl text-left outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50'
