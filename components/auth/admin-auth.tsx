'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/student/form-bits'
import { Heading, PasswordInput, Shell } from '@/components/auth/auth-bits'
import type { AuthScreen } from '@/components/auth/auth-flow'
import type { AuthProfile } from '@/lib/supabase/auth'
import { toast } from 'sonner'

const ADMIN_ID = /^(?:ADM\d{3}|ADMIN-\d{3})$/i

export function AdminLogin({
  setScreen,
  onLoggedIn,
  onStudentLogin,
  onFacultyLogin,
}: {
  setScreen: (s: AuthScreen) => void
  onLoggedIn: (profile: AuthProfile) => void
  onStudentLogin: () => void
  onFacultyLogin: () => void
}) {
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ id?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!ADMIN_ID.test(adminId.trim())) nextErrors.id = 'Enter a valid administrator ID.'
    if (password.length < 8) nextErrors.password = 'Enter your admin password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: adminId.trim().toUpperCase(), password, role: 'admin' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.')
      toast.success('Signed in to the Admin Portal')
      onLoggedIn(result.profile as AuthProfile)
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : 'Sign-in failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      <Heading title="Admin login" description="Restricted to Training & Placement Cell administrators." />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Admin ID" htmlFor="al-id" error={errors.id}>
          <Input id="al-id" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="e.g. ADM001" autoComplete="username" className="h-9 uppercase placeholder:normal-case" aria-invalid={!!errors.id || undefined} />
        </Field>
        <Field label="Password" htmlFor="al-pw" error={errors.password}>
          <PasswordInput id="al-pw" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!errors.password} />
        </Field>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => setScreen('forgot')} className="text-xs font-medium text-primary hover:underline">Forgot password?</button>
        </div>
        {errors.form && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
        <Button type="submit" size="lg" className="mt-1 h-9 w-full" disabled={submitting}>{submitting ? 'Signing in…' : 'Continue'}</Button>
      </form>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
        <button type="button" onClick={onStudentLogin} className="hover:text-primary hover:underline">Student sign in</button>
        <button type="button" onClick={onFacultyLogin} className="hover:text-primary hover:underline">Faculty sign in</button>
      </div>
    </Shell>
  )
}
