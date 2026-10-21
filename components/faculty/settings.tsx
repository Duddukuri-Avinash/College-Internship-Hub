'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, Panel } from '@/components/shared'
import { Field, Switch } from '@/components/student/form-bits'
import { PasswordInput } from '@/components/auth/auth-bits'
import { initials } from '@/components/faculty/bits'
import { TODAY, facultyAccount } from '@/lib/faculty-data'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function AccountPanel() {
  const [profile, setProfile] = useState(facultyAccount)
  const [phone, setPhone] = useState(facultyAccount.phone)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void fetch('/api/faculty/profile', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load faculty details.')
        return result as typeof facultyAccount
      })
      .then((result) => {
        if (!active) return
        setProfile(result)
        setPhone(result.phone)
      })
      .catch((loadError: unknown) => {
        if (active) toast.error(loadError instanceof Error ? loadError.message : 'Unable to load faculty details.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = (e: FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    if (!/^[6-9]\d{9}$/.test(digits)) return setError('Enter a valid 10-digit Indian mobile number.')
    setError('')
    toast.success('Account details saved')
  }
  const readOnly: [string, string][] = [
    ['Full name', profile.name],
    ['Employee ID', profile.employeeId],
    ['Department', profile.dept],
    ['Designation', profile.designation],
    ['Personal email', profile.email],
  ]
  return (
    <Panel title="Account details">
      <form onSubmit={save} noValidate>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent font-semibold text-primary" aria-hidden="true">{initials(profile.name)}</span>
          <div>
            <p className="font-medium">{loading ? 'Loading faculty details…' : profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.designation}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {readOnly.map(([label, value]) => (
            <Field key={label} label={label} htmlFor={`acc-${label}`}>
              <Input id={`acc-${label}`} value={value} readOnly className="h-9 bg-muted/50 text-muted-foreground" />
            </Field>
          ))}
          <Field label="Phone" htmlFor="acc-phone" error={error}>
            <Input id="acc-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError('') }} aria-invalid={!!error || undefined} className="h-9" autoComplete="tel" />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Name, employee ID, department and designation are managed by the college admin.</p>
        <div className="mt-4 flex justify-end"><Button type="submit">Save details</Button></div>
      </form>
    </Panel>
  )
}

function PasswordPanel() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'current' | 'next' | 'confirm', string>>>({})
  const save = (e: FormEvent) => {
    e.preventDefault()
    const err: typeof errors = {}
    if (!current) err.current = 'Enter your current password.'
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) err.next = 'Use at least 8 characters with a letter and a number.'
    else if (next === current) err.next = 'The new password must be different from the current one.'
    if (confirm !== next) err.confirm = 'Passwords do not match.'
    setErrors(err)
    if (Object.keys(err).length) return
    setCurrent('')
    setNext('')
    setConfirm('')
    toast.success('Password updated', { description: 'Use your new password the next time you sign in.' })
  }
  return (
    <Panel title="Change password">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Current password" htmlFor="pw-current" error={errors.current}>
          <PasswordInput id="pw-current" value={current} onChange={setCurrent} autoComplete="current-password" invalid={!!errors.current} />
        </Field>
        <Field label="New password" htmlFor="pw-new" error={errors.next} hint="At least 8 characters with a letter and a number.">
          <PasswordInput id="pw-new" value={next} onChange={setNext} autoComplete="new-password" invalid={!!errors.next} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm}>
          <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={!!errors.confirm} />
        </Field>
        <div className="flex justify-end"><Button type="submit">Update password</Button></div>
      </form>
    </Panel>
  )
}

function NotificationsPanel() {
  const [prefs, setPrefs] = useState({ submissions: true, sla: true, requests: true, email: false })
  const rows: [keyof typeof prefs, string, string][] = [
    ['submissions', 'New submissions', 'When a student uploads an offer letter, certificate or experience post.'],
    ['sla', 'SLA reminders', 'When a submission is close to the 3-working-day review limit.'],
    ['requests', 'Student requests', 'When a student sends an NOC, letter, re-verification or query.'],
    ['email', 'Daily email digest', 'A summary of pending work at 8:00 AM.'],
  ]
  return (
    <Panel title="Notification preferences">
      <ul className="divide-y">
        {rows.map(([key, label, hint]) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <Switch label={label} checked={prefs[key]} onChange={(v) => { setPrefs((p) => ({ ...p, [key]: v })); toast.success(`${label} ${v ? 'on' : 'off'}`) }} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function AvailabilityPanel() {
  const [workDays, setWorkDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [start, setStart] = useState('09:30')
  const [end, setEnd] = useState('16:30')
  const [away, setAway] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('I am away and will review submissions after I return. For urgent NOC requests, contact the HoD office.')
  const [errors, setErrors] = useState<Partial<Record<'days' | 'time' | 'from' | 'to' | 'message', string>>>({})

  const save = (e: FormEvent) => {
    e.preventDefault()
    const err: typeof errors = {}
    if (!workDays.length) err.days = 'Select at least one working day.'
    if (end <= start) err.time = 'End time must be after start time.'
    if (away) {
      if (!from) err.from = 'Choose a start date.'
      else if (from < TODAY) err.from = 'Start date cannot be in the past.'
      if (!to) err.to = 'Choose an end date.'
      else if (from && to < from) err.to = 'End date must be on or after the start date.'
      if (message.trim().length < 10) err.message = 'Write an auto-reply of at least 10 characters.'
    }
    setErrors(err)
    if (Object.keys(err).length) return
    toast.success('Availability saved', { description: away ? 'Out-of-office auto-reply is on.' : `${workDays.join(', ')} · ${start}–${end}` })
  }

  return (
    <Panel title="Working hours & out of office">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Working days</legend>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <input type="checkbox" className="accent-primary" checked={workDays.includes(d)} onChange={() => setWorkDays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))} />
                {d}
              </label>
            ))}
          </div>
          {errors.days && <p className="mt-1.5 text-xs text-destructive" role="alert">{errors.days}</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time" htmlFor="wh-start"><Input id="wh-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" /></Field>
          <Field label="End time" htmlFor="wh-end" error={errors.time}><Input id="wh-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" aria-invalid={!!errors.time || undefined} /></Field>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">SLA timers count only your working days.</p>

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-sm font-medium">Out of office</p>
            <p className="text-xs text-muted-foreground">Students see your auto-reply and submissions are flagged for a backup reviewer.</p>
          </div>
          <Switch label="Out of office" checked={away} onChange={setAway} />
        </div>
        {away && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor="ooo-from" error={errors.from}><Input id="ooo-from" type="date" min={TODAY} value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" aria-invalid={!!errors.from || undefined} /></Field>
            <Field label="To" htmlFor="ooo-to" error={errors.to}><Input id="ooo-to" type="date" min={from || TODAY} value={to} onChange={(e) => setTo(e.target.value)} className="h-9" aria-invalid={!!errors.to || undefined} /></Field>
            <Field label="Auto-reply message" htmlFor="ooo-msg" error={errors.message} className="sm:col-span-2"><Textarea id="ooo-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message || undefined} /></Field>
          </div>
        )}
        <div className="flex justify-end"><Button type="submit">Save availability</Button></div>
      </form>
    </Panel>
  )
}

export function FacultySettings() {
  return (
    <>
      <PageHeader title="Profile & Settings" description="Manage your account, password, notifications and availability." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <AccountPanel />
          <NotificationsPanel />
        </div>
        <div className="flex flex-col gap-6">
          <PasswordPanel />
          <AvailabilityPanel />
        </div>
      </div>
    </>
  )
}
