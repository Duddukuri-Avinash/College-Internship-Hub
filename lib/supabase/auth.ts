'use client'

export const COLLEGE_EMAIL_DOMAIN = '@rvrjc.ac.in'
export type AuthRole = 'student' | 'faculty' | 'admin'

export type AuthProfile = {
  id: string
  email: string
  full_name: string
  role: AuthRole
  status: string
  first_login?: boolean
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Request failed.')
  return result
}

export function isCollegeEmail(email: string) {
  return email.trim().toLowerCase().endsWith(COLLEGE_EMAIL_DOMAIN)
}

export async function getSignedInProfile(): Promise<AuthProfile | null> {
  const response = await fetch('/api/auth/me')
  if (response.status === 401) return null
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error ?? 'Could not load your account.')
  return result.profile as AuthProfile
}

export async function signOut() {
  await request('/api/auth/logout', { method: 'POST' })
}

export async function registerStudent(input: { name: string; roll: string; phone: string; password: string }) {
  return request('/api/auth/register/student', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function registerFaculty(input: {
  name: string; employeeId: string; dept: string; designation: string; email: string; phone: string; password: string
}) {
  return request('/api/auth/register/faculty', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function resendSignupEmail(_email: string) {
  throw new Error('Email verification is not configured for the SQL Server backend.')
}

export async function updatePassword(password: string) {
  await request('/api/auth/password', { method: 'POST', body: JSON.stringify({ password }) })
}

export async function requestPasswordReset(identifier: string, role: AuthRole) {
  await request('/api/auth/recovery', {
    method: 'POST',
    body: JSON.stringify({ identifier, role }),
  })
}
