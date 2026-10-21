'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bar } from '@/components/shared'
import { Field } from '@/components/student/form-bits'
import { Heading, PasswordInput, Shell, passwordStrength, type Persona } from '@/components/auth/auth-bits'
import { FacultyLogin, FacultyPending, FacultyRegister, type RegisteredFaculty } from '@/components/auth/faculty-auth'
import { AdminLogin } from '@/components/auth/admin-auth'
import {
  registerStudent,
  resendSignupEmail,
  requestPasswordReset,
  updatePassword,
  type AuthProfile,
} from '@/lib/supabase/auth'

export type AuthScreen = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'faculty-register' | 'faculty-pending'

export type RegisteredStudent = {
  name: string
  roll: string
  email: string
  phone: string
}

export function AuthFlow({
  screen,
  setScreen,
  registered,
  setRegistered,
  initialFaculty,
  onAuthenticated,
}: {
  screen: AuthScreen
  setScreen: (s: AuthScreen) => void
  registered: RegisteredStudent | null
  setRegistered: (student: RegisteredStudent | null) => void
  initialFaculty: RegisteredFaculty | null
  onAuthenticated: (profile: AuthProfile, firstLogin: boolean) => void
}) {
  const [persona, setPersona] = useState<Persona>('student')
  const [faculty, setFaculty] = useState<RegisteredFaculty | null>(null)
  useEffect(() => {
    if (initialFaculty) setFaculty(initialFaculty)
  }, [initialFaculty])

  if (screen === 'register') return <Register setScreen={setScreen} setRegistered={setRegistered} onAuthenticated={onAuthenticated} />
  if (screen === 'verify') return <Verify setScreen={setScreen} registered={registered} />
  if (screen === 'forgot') return <Forgot setScreen={setScreen} persona={persona} />
  if (screen === 'reset') return <Reset setScreen={setScreen} />
  if (screen === 'faculty-register') return <FacultyRegister setScreen={setScreen} setFaculty={setFaculty} />
  if (screen === 'faculty-pending') return <FacultyPending setScreen={setScreen} faculty={faculty} />
  if (persona === 'admin') return <AdminLogin setScreen={setScreen} onLoggedIn={(profile) => onAuthenticated(profile, false)} onStudentLogin={() => setPersona('student')} onFacultyLogin={() => setPersona('faculty')} />
  if (persona === 'faculty') return <FacultyLogin setScreen={setScreen} onLoggedIn={(profile) => onAuthenticated(profile, false)} onStudentLogin={() => setPersona('student')} onAdminLogin={() => setPersona('admin')} />
  return <Login setScreen={setScreen} onAuthenticated={onAuthenticated} onFacultyLogin={() => setPersona('faculty')} onAdminLogin={() => setPersona('admin')} />
}

/* ------------------------------ Login ------------------------------ */

function Login({ setScreen, onAuthenticated, onFacultyLogin, onAdminLogin }: { setScreen: (s: AuthScreen) => void; onAuthenticated: (profile: AuthProfile, firstLogin: boolean) => void; onFacultyLogin: () => void; onAdminLogin: () => void }) {
  const [roll, setRoll] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    const r = roll.trim().toUpperCase()
    if (!r || !password) {
      setError('Enter your roll number and password.')
      setPending(false)
      return
    }
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: r, password, role: 'student' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.')
      toast.success('Welcome to InternHub')
      onAuthenticated(result.profile as AuthProfile, false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
      setPending(false)
    }
  }

  return (
    <Shell>
      <Heading title="Student login" description="Sign in with your college roll number." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Roll number" htmlFor="login-roll">
          <Input id="login-roll" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="Enter your roll number" autoComplete="username" className="h-9 uppercase placeholder:normal-case" />
        </Field>
        <Field label="Password" htmlFor="login-pw">
          <PasswordInput id="login-pw" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => setScreen('forgot')} className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-1 h-9 w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
        <button type="button" onClick={onFacultyLogin} className="hover:text-primary hover:underline">Faculty sign in</button>
        <button type="button" onClick={onAdminLogin} className="hover:text-primary hover:underline">Administrator sign in</button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to InternHub?{' '}
        <button onClick={() => setScreen('register')} className="font-medium text-primary hover:underline">
          Create your account
        </button>
      </p>

    </Shell>
  )
}

/* ---------------------------- Registration ---------------------------- */

function Register({
  setScreen,
  setRegistered,
  onAuthenticated,
}: {
  setScreen: (s: AuthScreen) => void
  setRegistered: (student: RegisteredStudent | null) => void
  onAuthenticated: (profile: AuthProfile, firstLogin: boolean) => void
}) {
  const [f, setF] = useState({ name: '', roll: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const strength = passwordStrength(f.password)

  function validate() {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Enter your full name as on college records.'
    if (!/^[A-Za-z]\d{2}[A-Za-z]{2,4}\d{3}$/.test(f.roll.trim())) e.roll = 'Use your college roll number format.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid personal email address.'
    if (!/^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(f.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number.'
    if (f.password.length < 8) e.password = 'Use at least 8 characters.'
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
    return e
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    try {
      await registerStudent(f)
      setRegistered({ name: f.name.trim(), roll: f.roll.trim().toUpperCase(), email: f.email.trim().toLowerCase(), phone: f.phone.trim() })
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: f.roll.trim().toUpperCase(), password: f.password, role: 'student' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Account was created, but sign-in failed.')
      toast.success('Account created successfully.')
      onAuthenticated(result.profile as AuthProfile, true)
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Registration failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      <Heading title="Create your student account" description="Use your college details so faculty can verify your records." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" htmlFor="reg-name" error={errors.name}>
          <Input id="reg-name" value={f.name} onChange={(e) => set('name')(e.target.value)} autoComplete="name" className="h-9" aria-invalid={!!errors.name || undefined} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Roll number" htmlFor="reg-roll" error={errors.roll}>
            <Input id="reg-roll" value={f.roll} onChange={(e) => set('roll')(e.target.value)} placeholder="Enter your college roll number" className="h-9 uppercase placeholder:normal-case" aria-invalid={!!errors.roll || undefined} />
          </Field>
          <Field label="Phone" htmlFor="reg-phone" error={errors.phone}>
            <Input id="reg-phone" type="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="Enter your mobile number" autoComplete="tel" className="h-9" aria-invalid={!!errors.phone || undefined} />
          </Field>
        </div>
        <Field label="Personal email" htmlFor="reg-email" error={errors.email} hint="Used for account access and notifications.">
          <Input id="reg-email" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-9" aria-invalid={!!errors.email || undefined} />
        </Field>
        <Field label="Password" htmlFor="reg-pw" error={errors.password}>
          <PasswordInput id="reg-pw" value={f.password} onChange={set('password')} autoComplete="new-password" invalid={!!errors.password} />
          {f.password && (
            <div className="flex items-center gap-3">
              <Bar value={strength.value} tone={strength.tone} className="h-1.5" />
              <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirm}>
          <PasswordInput id="reg-confirm" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" invalid={!!errors.confirm} />
        </Field>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
        <Button type="submit" size="lg" className="mt-1 h-9 w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <button onClick={() => setScreen('login')} className="font-medium text-primary hover:underline">
          Sign in
        </button>
      </p>
    </Shell>
  )
}

function Verify({ setScreen, registered }: { setScreen: (s: AuthScreen) => void; registered: RegisteredStudent | null }) {
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (!registered) {
    return (
      <Shell>
        <Heading title="No pending verification" description="Create a student account first." />
        <Button onClick={() => setScreen('register')}>Go to registration</Button>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Verify your personal email</h1>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">We sent a verification link to</p>
        <p className="mt-0.5 break-all text-sm font-medium">{registered.email}</p>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-9 w-full"
          disabled={cooldown > 0 || resending}
          onClick={async () => {
            setResending(true)
            setError('')
            try {
              await resendSignupEmail(registered.email)
              setCooldown(30)
              toast.success('Verification email sent.')
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Could not resend the verification email.')
            } finally {
              setResending(false)
            }
          }}
        >
          {resending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Open the link in your email to verify your account. Check your spam folder if needed.</p>
      </div>
      <button onClick={() => setScreen('login')} className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to login
      </button>
    </Shell>
  )
}

/* ---------------------------- Forgot / Reset ---------------------------- */

function Forgot({ setScreen, persona }: { setScreen: (s: AuthScreen) => void; persona: Persona }) {
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const idLabel = persona === 'faculty' ? 'employee ID' : persona === 'admin' ? 'admin ID' : 'roll number'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!id.trim()) {
      setError(`Enter your ${idLabel} or email.`)
      return
    }
    setError('')
    setPending(true)
    try {
      await requestPasswordReset(id.trim(), persona)
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password reset request failed.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">If an account exists for that {idLabel} or email, a reset link has been sent to the registered personal email.</p>
        </div>
        <button onClick={() => setScreen('login')} className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to login
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <Heading title="Forgot password" description={`Enter your ${idLabel} or personal email and we will send a reset link.`} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={persona === 'faculty' ? 'Employee ID or email' : persona === 'admin' ? 'Admin ID or email' : 'Roll number or email'} htmlFor="fp-id" error={error}>
          <Input id="fp-id" value={id} onChange={(e) => setId(e.target.value)} className="h-9" aria-invalid={!!error || undefined} />
        </Field>
        <Button type="submit" size="lg" className="h-9 w-full" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <button onClick={() => setScreen('login')} className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to login
      </button>
    </Shell>
  )
}

function Reset({ setScreen }: { setScreen: (s: AuthScreen) => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const strength = passwordStrength(pw)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (pw.length < 8) er.pw = 'Use at least 8 characters.'
    if (confirm !== pw) er.confirm = 'Passwords do not match.'
    setErrors(er)
    if (Object.keys(er).length) return
    setSubmitting(true)
    try {
      await updatePassword(pw)
      setDone(true)
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Password could not be updated.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Password updated</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your new password.</p>
        </div>
        <Button size="lg" className="mt-6 h-9 w-full" onClick={() => setScreen('login')}>
          Back to login
        </Button>
      </Shell>
    )
  }

  return (
    <Shell>
      <Heading title="Reset password" description="Choose a new password for your InternHub account." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="New password" htmlFor="rs-pw" error={errors.pw}>
          <PasswordInput id="rs-pw" value={pw} onChange={setPw} autoComplete="new-password" invalid={!!errors.pw} />
          {pw && (
            <div className="flex items-center gap-3">
              <Bar value={strength.value} tone={strength.tone} className="h-1.5" />
              <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm new password" htmlFor="rs-confirm" error={errors.confirm}>
          <PasswordInput id="rs-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={!!errors.confirm} />
        </Field>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
        <Button type="submit" size="lg" className="h-9 w-full" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Shell>
  )
}
