'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { AuthProfile } from '@/lib/supabase/auth'
import { extractResumeSkills } from '@/lib/resume-skills'

export type StudentAccount = {
  fullName: string
  email: string
  rollNumber: string
  phone: string
  branch: string
  year: number
  section: string
  skills: string[]
  languages: string[]
  tools: string[]
  certifications: string[]
  linkedin: string
  github: string
  domain: string
  mode: string
  location: string
}

export type StudentResume = {
  id: string
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
}

export function getProfileCompletion(account: StudentAccount | null, resume: StudentResume | null) {
  if (!account) return 0
  const sections = [
    account.branch !== 'Unassigned' && account.year > 0 && account.section !== 'Unassigned',
    account.skills.length > 0,
    account.languages.length > 0,
    account.tools.length > 0,
    account.certifications.length > 0,
    Boolean(account.linkedin && account.github),
    Boolean(account.domain && account.mode && account.location),
    Boolean(resume),
  ]
  return Math.round((sections.filter(Boolean).length / sections.length) * 100)
}

export function getInternshipReadiness(account: StudentAccount | null, resume: StudentResume | null) {
  if (!account) return 0
  const signals = [
    account.skills.length > 0,
    account.languages.length > 0,
    account.tools.length > 0,
    Boolean(account.certifications.length),
    Boolean(account.linkedin && account.github),
    Boolean(account.domain && account.mode && account.location),
    Boolean(resume),
  ]
  return Math.round((signals.filter(Boolean).length / signals.length) * 100)
}

type StudentAccountContextValue = {
  account: StudentAccount | null
  resume: StudentResume | null
  loading: boolean
  updatePhone: (phone: string) => Promise<void>
  updateStudentDetails: (details: {
    branch: string
    year: number
    section: string
    skills: string[]
    languages: string[]
    tools: string[]
    certifications: string[]
    linkedin: string
    github: string
    domain: string
    mode: string
    location: string
  }) => Promise<void>
  uploadResume: (file: File) => Promise<void>
  syncResumeSkills: () => Promise<string[]>
  submitVerificationDocument: (file: File, kind: 'offer_letter' | 'certificate' | 'other') => Promise<void>
  downloadResume: () => Promise<string>
}

const StudentAccountContext = createContext<StudentAccountContextValue | null>(null)

export function StudentAccountProvider({ profile, children }: { profile: AuthProfile; children: ReactNode }) {
  const [account, setAccount] = useState<StudentAccount | null>(null)
  const [resume, setResume] = useState<StudentResume | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAccount = useCallback(async () => {
    if (profile.role !== 'student') return
    const response = await fetch('/api/student/me', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load student account details.')
    setAccount(result.account)
    setResume(result.account.resume)
  }, [profile.email, profile.full_name, profile.id, profile.role])

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadAccount()
      .catch((error: unknown) => {
        console.error('Unable to load student account details:', error)
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load student account details.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadAccount])

  const updatePhone = useCallback(async (phone: string) => {
    const current = account
    if (!current) throw new Error('Student account details are not loaded.')
    const response = await fetch('/api/student/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...current, phone: phone.trim() }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result.error ?? result.detail ?? 'Unable to update your phone number.')
    }
    setAccount((current) => current ? { ...current, phone: phone.trim() } : current)
  }, [account])

  const updateStudentDetails = useCallback(async (details: {
    branch: string
    year: number
    section: string
    skills: string[]
    languages: string[]
    tools: string[]
    certifications: string[]
    linkedin: string
    github: string
    domain: string
    mode: string
    location: string
  }) => {
    const response = await fetch('/api/student/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...details, phone: account?.phone ?? '' }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result.error ?? result.detail ?? 'Unable to update student details.')
    }
    setAccount((current) => current ? {
      ...current,
      ...details,
      linkedin: details.linkedin.trim(),
      github: details.github.trim(),
      domain: details.domain.trim(),
      mode: details.mode.trim(),
      location: details.location.trim(),
    } : current)
  }, [account?.phone])

  const uploadResume = useCallback(async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/student/me/documents/resume', { method: 'POST', body })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to upload your resume.')
    setResume(result.document)
  }, [])

  const syncResumeSkills = useCallback(async () => {
    if (!resume) return []
    const downloadResponse = await fetch(`/api/student/documents/${resume.id}/download`)
    if (!downloadResponse.ok) throw new Error('Unable to download your resume.')
    const detectedSkills = await extractResumeSkills(new File([await downloadResponse.blob()], resume.fileName, { type: resume.mimeType }))
    if (!detectedSkills.length) return []

    const current = account
    if (!current) return detectedSkills
    const skills = [...new Set([...current.skills, ...detectedSkills])]
    if (skills.length === current.skills.length) return detectedSkills

    const saveResponse = await fetch('/api/student/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...current, skills, languages: current.languages }),
    })
    if (!saveResponse.ok) throw new Error('Unable to save detected resume skills.')
    setAccount((value) => value ? { ...value, skills } : value)
    return detectedSkills
  }, [account, resume])

  const submitVerificationDocument = useCallback(async (file: File, kind: 'offer_letter' | 'certificate' | 'other') => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`/api/student/me/documents/${kind}`, { method: 'POST', body })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to upload your document.')
  }, [])

  const downloadResume = useCallback(async () => {
    if (!resume) throw new Error('Upload a resume first.')
    return `/api/student/documents/${resume.id}/download`
  }, [resume])

  return (
    <StudentAccountContext.Provider value={{ account, resume, loading, updatePhone, updateStudentDetails, uploadResume, syncResumeSkills, submitVerificationDocument, downloadResume }}>
      {children}
    </StudentAccountContext.Provider>
  )
}

export function useStudentAccount() {
  const value = useContext(StudentAccountContext)
  if (!value) throw new Error('Student account details are unavailable outside the student portal.')
  return value
}
