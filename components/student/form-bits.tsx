'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

/** Chip-style multi-value input. Enter or comma adds a value; suggestions are one-click. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  id?: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, '')
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase())) return
    onChange([...value, t])
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded hover:text-destructive">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => {
            add(draft)
            setDraft('')
          }}
          placeholder={value.length ? '' : placeholder}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span className={cn('inline-block size-4 rounded-full bg-card shadow-sm transition-transform', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
    </button>
  )
}

/** Label + helper + error wrapper that matches the existing form rhythm. */
export function Field({ label, htmlFor, hint, error, className, children }: { label: string; htmlFor?: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
