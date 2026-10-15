'use client'

import { useState, type ReactNode } from 'react'
import { Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { COLLEGE } from '@/lib/data'

export type Persona = 'student' | 'faculty' | 'admin'

export function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][pw.length ? score : 0]
  return { score, label, value: pw ? Math.max(10, score * 25) : 0, tone: score >= 3 ? ('success' as const) : score === 2 ? ('warning' as const) : ('primary' as const) }
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; invalid?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={invalid || undefined} className="h-9 pr-9" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex flex-col justify-between gap-8 bg-sidebar p-6 text-sidebar-foreground lg:sticky lg:top-0 lg:h-dvh lg:w-[26rem] lg:shrink-0 lg:p-10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold leading-tight text-sidebar-primary">InternHub</p>
            <p className="text-xs leading-snug text-sidebar-foreground/75">{COLLEGE.name}</p>
          </div>
        </div>
        <div className="hidden lg:block">
          <h2 className="text-balance text-2xl font-semibold text-sidebar-primary">Your internship journey, verified by your college.</h2>
          <p className="mt-3 max-w-sm text-pretty text-sm text-sidebar-foreground/80">Discover opportunities and build a faculty-verified internship record in one place.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-lg bg-sidebar-accent/60 p-3 text-xs lg:flex">
          <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
          <span className="text-sidebar-foreground/85">Access is limited to {COLLEGE.short} students and faculty with a college email.</span>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-1 duration-300">{children}</div>
      </main>
    </div>
  )
}

export function Heading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-balance text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
