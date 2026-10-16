'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bar, VerifyBadge, selectClass } from '@/components/shared'
import { Field } from '@/components/student/form-bits'
import { Heading, PasswordInput, Shell, passwordStrength } from '@/components/auth/auth-bits'
import type { AuthScreen } from '@/components/auth/auth-flow'
import { registerFaculty, type AuthProfile } from '@/lib/supabase/auth'
import { branches as departments } from '@/lib/branches'

export type RegisteredFaculty = {
  name: string
  employeeId: string
  dept: string
  designation: string
  email: string
  phone: string
  approved: boolean
}

const COLLEGE_DOMAIN = '@rvrjc.ac.in'
const EMP_ID = /^RVR\d{4}$/i
const designations = ['Assistant Professor', 'Associate Professor', 'Professor', 'Head of Department', 'Internship Coordinator']

export function FacultyLogin({ setScreen, onLoggedIn, onStudentLogin, onAdminLogin }: { setScreen: (s: AuthScreen) => void; onLoggedIn: (profile: AuthProfile) => void; onStudentLogin: () => void; onAdminLogin: () => void }) {
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ empId?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const id = empId.trim().toUpperCase()
    const er: typeof errors = {}
    if (!EMP_ID.test(id)) er.empId = 'Use your RVR employee ID followed by four digits.'
    if (!password) er.password = 'Enter your password.'
    setErrors(er)
    if (Object.keys(er).length) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: id, password, role: 'faculty' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.')
      toast.success('Signed in to the Faculty Portal')
      onLoggedIn(result.profile as AuthProfile)
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Sign-in failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      <Heading title="Faculty login" description="Sign in with your employee ID to verify internships and manage opportunities." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Employee ID" htmlFor="fl-id" error={errors.empId}>
          <Input id="fl-id" value={empId} onChange={(e) => setEmpId(e.target.value)} placeholder="Enter your employee ID" autoComplete="username" className="h-9 uppercase placeholder:normal-case" aria-invalid={!!errors.empId || undefined} />
        </Field>
        <Field label="Password" htmlFor="fl-pw" error={errors.password}>
          <PasswordInput id="fl-pw" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!errors.password} />
        </Field>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => setScreen('forgot')} className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        {errors.form && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{errors.form}</p>
        )}
        <Button type="submit" size="lg" className="mt-1 h-9 w-full" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
        <button type="button" onClick={onStudentLogin} className="hover:text-primary hover:underline">Student sign in</button>
        <button type="button" onClick={onAdminLogin} className="hover:text-primary hover:underline">Administrator sign in</button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New faculty member?{' '}
        <button onClick={() => setScreen('faculty-register')} className="font-medium text-primary hover:underline">Request an account</button>
      </p>
    </Shell>
  )
}

export function FacultyRegister({ setScreen, setFaculty }: { setScreen: (s: AuthScreen) => void; setFaculty: (f: RegisteredFaculty) => void }) {
  const [f, setF] = useState({ name: '', employeeId: '', dept: '', designation: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const strength = passwordStrength(f.password)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Enter your full name.'
    if (!EMP_ID.test(f.employeeId.trim())) e.employeeId = 'Use your RVR employee ID followed by four digits.'
    if (!f.dept) e.dept = 'Select your department.'
    if (!f.designation) e.designation = 'Select your designation.'
    if (!f.email.trim().toLowerCase().endsWith(COLLEGE_DOMAIN)) e.email = `Use your college email ending with ${COLLEGE_DOMAIN}.`
    if (!/^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(f.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number.'
    if (f.password.length < 8) e.password = 'Use at least 8 characters.'
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    try {
      await registerFaculty(f)
      setFaculty({ name: f.name.trim(), employeeId: f.employeeId.trim().toUpperCase(), dept: f.dept, designation: f.designation, email: f.email.trim().toLowerCase(), phone: f.phone.trim(), approved: false })
      toast.success('Verification email sent; registration is pending admin approval.')
      setScreen('faculty-pending')
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Registration failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inv = (k: string) => (errors[k] ? true : undefined)

  return (
    <Shell>
      <Heading title="Faculty registration" description="Your account will be activated after the college admin approves it." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" htmlFor="fr-name" error={errors.name}>
          <Input id="fr-name" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Enter your full name" autoComplete="name" className="h-9" aria-invalid={inv('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee ID" htmlFor="fr-id" error={errors.employeeId}>
            <Input id="fr-id" value={f.employeeId} onChange={(e) => set('employeeId')(e.target.value)} placeholder="Enter your employee ID" className="h-9 uppercase placeholder:normal-case" aria-invalid={inv('employeeId')} />
          </Field>
          <Field label="Phone" htmlFor="fr-phone" error={errors.phone}>
            <Input id="fr-phone" type="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="Enter your mobile number" autoComplete="tel" className="h-9" aria-invalid={inv('phone')} />
          </Field>
          <Field label="Department" htmlFor="fr-dept" error={errors.dept}>
            <select id="fr-dept" value={f.dept} onChange={(e) => set('dept')(e.target.value)} className={selectClass} aria-invalid={inv('dept')}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Designation" htmlFor="fr-des" error={errors.designation}>
            <select id="fr-des" value={f.designation} onChange={(e) => set('designation')(e.target.value)} className={selectClass} aria-invalid={inv('designation')}>
              <option value="">Select designation</option>
              {designations.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <Field label="College email" htmlFor="fr-email" error={errors.email}>
          <Input id="fr-email" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} placeholder={`name${COLLEGE_DOMAIN}`} autoComplete="email" className="h-9" aria-invalid={inv('email')} />
        </Field>
        <Field label="Password" htmlFor="fr-pw" error={errors.password}>
          <PasswordInput id="fr-pw" value={f.password} onChange={set('password')} autoComplete="new-password" invalid={!!errors.password} />
          {f.password && (
            <div className="flex items-center gap-3">
              <Bar value={strength.value} tone={strength.tone} className="h-1.5" />
              <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm password" htmlFor="fr-confirm" error={errors.confirm}>
          <PasswordInput id="fr-confirm" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" invalid={!!errors.confirm} />
        </Field>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
        <Button type="submit" size="lg" className="mt-1 h-9 w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for approval'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already approved?{' '}
        <button onClick={() => setScreen('login')} className="font-medium text-primary hover:underline">Sign in</button>
      </p>
    </Shell>
  )
}

export function FacultyPending({ setScreen, faculty }: { setScreen: (s: AuthScreen) => void; faculty: RegisteredFaculty | null }) {
  if (!faculty) {
    return (
      <Shell>
        <Heading title="No pending registration" description="Submit a faculty registration first." />
        <Button onClick={() => setScreen('faculty-register')}>Go to registration</Button>
      </Shell>
    )
  }
  const approved = faculty.approved
  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <span className={`flex size-14 items-center justify-center rounded-2xl ${approved ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning-foreground'}`}>
          {approved ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <Clock className="size-7" aria-hidden="true" />}
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{approved ? 'Account approved' : 'Pending admin approval'}</h1>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          {approved ? 'Your faculty account is active. Sign in with your employee ID.' : 'Your faculty account is awaiting review. Faculty portal access remains unavailable until an administrator approves it.'}
        </p>
        <div className="mt-3"><VerifyBadge status={approved ? 'Verified' : 'Pending'} /></div>
      </div>
      <dl className="mt-6 flex flex-col gap-2 rounded-lg border bg-card p-4 text-sm">
        {[['Name', faculty.name], ['Employee ID', faculty.employeeId], ['Department', faculty.dept], ['Designation', faculty.designation], ['Email', faculty.email]].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="break-all text-right font-medium">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-center text-xs text-muted-foreground">Confirm your college email first. Faculty portal access is enabled only after admin approval.</p>
      <Button size="lg" className="mt-6 h-9 w-full" onClick={() => setScreen('login')}>Back to sign in</Button>
      <button onClick={() => setScreen('login')} className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to login
      </button>
    </Shell>
  )
}
