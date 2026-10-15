'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Award,
  BadgeCheck,
  Briefcase,
  Download,
  FileText,
  FolderGit2,
  Code2,
  GraduationCap,
  Link2,
  Mail,
  Phone,
  Trophy,
  Upload,
  UserRoundPen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bar, Chip, Panel, VerifyBadge } from '@/components/shared'
import { COLLEGE, formatDate, myInternships, student } from '@/lib/data'
import type { View } from '@/components/app-shell'
import { getInternshipReadiness, getProfileCompletion, useStudentAccount } from '@/components/student/student-account-provider'
import { extractResumeSkills } from '@/lib/resume-skills'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_RESUME_BYTES = 5 * 1024 * 1024

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary [&_svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-medium">{value}</dd>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function StudentProfile({ navigate }: { navigate: (v: View) => void }) {
  const { account, loading, resume: savedResume, uploadResume, updateStudentDetails, downloadResume } = useStudentAccount()
  const profileCompletion = getProfileCompletion(account, savedResume)
  const readiness = getInternshipReadiness(account, savedResume)
  const maxSgpa = 10
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resume, setResume] = useState<{ name: string; updated: string; size?: string; url?: string }>({
    name: student.resume,
    updated: student.resumeUpdated,
  })

  useEffect(() => {
    if (savedResume) {
      setResume({
        name: savedResume.fileName,
        updated: '',
        size:
          savedResume.sizeBytes >= 1024 * 1024
            ? `${(savedResume.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.max(1, Math.round(savedResume.sizeBytes / 1024))} KB`,
      })
    }
  }, [savedResume])

  useEffect(() => {
    return () => {
      if (resume.url) URL.revokeObjectURL(resume.url)
    }
  }, [resume.url])

  async function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a PDF or DOCX file')
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error('File is too large. Maximum size is 5 MB')
      return
    }
    try {
      await uploadResume(file)
      const detectedSkills = await extractResumeSkills(file)
      if (account && detectedSkills.length) {
        await updateStudentDetails({
          branch: account.branch,
          year: account.year,
          section: account.section,
          skills: [...new Set([...account.skills, ...detectedSkills])],
          languages: account.languages,
          tools: account.tools,
          certifications: account.certifications,
          linkedin: account.linkedin,
          github: account.github,
          domain: account.domain,
          mode: account.mode,
          location: account.location,
        })
        toast.success(`Resume uploaded and ${detectedSkills.length} skill${detectedSkills.length === 1 ? '' : 's'} added to your profile.`)
      } else {
        toast.success('Resume uploaded. No recognized skills were found; add skills manually from Edit Profile.')
      }
    } catch (error) {
      console.error('Unable to upload resume:', error)
      toast.error(error instanceof Error ? `Resume uploaded, but skill detection failed: ${error.message}` : 'Resume uploaded, but skill detection failed.')
    }
  }

  async function handleDownload() {
    if (!savedResume && !resume.url) {
      toast.info('Upload a resume first to download it')
      return
    }
    if (savedResume) {
      try {
        const url = await downloadResume()
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Unable to create resume download link:', error)
        toast.error(error instanceof Error ? error.message : 'Unable to download resume.')
      }
      return
    }
    const link = document.createElement('a')
    if (!resume.url) return
    link.href = resume.url
    link.download = resume.name
    link.click()
  }

  return (
    <>
      <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Your account details and resume upload are connected to Supabase. Portfolio details are not yet connected.
      </div>
      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="h-24 bg-primary sm:h-28" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <span
              className="-mt-12 flex size-24 items-center justify-center rounded-2xl border-4 border-card bg-accent text-3xl font-semibold text-primary shadow-sm"
              aria-hidden="true"
            >
              {(account?.fullName ?? 'Student').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                {account?.fullName ?? (loading ? 'Loading…' : 'Student account unavailable')}
                {account && <BadgeCheck className="size-5 text-success" aria-label="Verified student" />}
              </h1>
              <p className="text-sm text-muted-foreground">
                {account?.rollNumber ?? ''}
              </p>
              <p className="text-xs text-muted-foreground">{COLLEGE.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { void handleDownload() }}>
              <Download /> Resume
            </Button>
            <Button onClick={() => navigate({ name: 'onboarding' })}>
              <UserRoundPen /> Edit Profile
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t px-5 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
          <Fact label="Branch" value={account?.branch === 'Unassigned' ? 'Not set' : account?.branch ?? '—'} />
          <Fact label="Year" value={account?.year ?? '—'} />
          <Fact label="Section" value={account?.section === 'Unassigned' ? 'Not set' : account?.section ?? '—'} />
          <Fact label="CGPA" value="Not provided" />
          <Fact label="Internship activity" value={myInternships.length ? myInternships.length : 'None recorded'} />
          <Fact label="Account status" value={loading ? 'Loading…' : 'Active'} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Panel title="Profile Strength">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold tabular-nums">{loading ? '—' : `${profileCompletion}%`}</span>
              <span className="text-xs text-muted-foreground">{loading ? 'Loading…' : `${readiness}% readiness`}</span>
            </div>
            <ul className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li>Complete your skills, links, preferences, and resume to improve your profile.</li>
            </ul>
          </Panel>

          <Panel title="Personal Details">
            <dl className="flex flex-col gap-4">
              <InfoRow icon={<Mail />} label="College email" value={account?.email ?? (loading ? 'Loading…' : 'Unavailable')} />
              <InfoRow icon={<Phone />} label="Phone" value={account?.phone || 'Not provided'} />
              <InfoRow icon={<GraduationCap />} label="Faculty mentor" value="Not assigned" />
            </dl>
          </Panel>

          <Panel title="Links & Documents">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
                <Link2 className="size-4 text-primary" aria-hidden="true" /> LinkedIn: {account?.linkedin || 'Not provided'}
              </li>
              <li className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
                <Code2 className="size-4 text-primary" aria-hidden="true" /> GitHub: {account?.github || 'Not provided'}
              </li>
              <li className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-2 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{resume.name || 'No resume uploaded'}</p>
                    <p className="text-xs text-muted-foreground">
                      {resume.updated ? `Updated ${formatDate(resume.updated)}` : 'No upload date'}
                      {resume.size ? ` · ${resume.size}` : ''}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  className="sr-only"
                  aria-label="Upload resume"
                  onChange={(event) => { void handleResumeChange(event) }}
                />
                <Button size="sm" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload /> {resume.url ? 'Replace Resume' : 'Upload New Resume'}
                </Button>
                <p className="text-xs text-muted-foreground">PDF or DOCX, up to 5 MB</p>
              </li>
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="About">
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{student.about || 'No profile summary provided.'}</p>
          </Panel>

          <Panel title="Academic Performance" action={<span className="text-sm text-muted-foreground">CGPA <strong className="text-foreground">Not provided</strong></span>}>
            <div className="flex h-36 items-end gap-3" role="list" aria-label="Semester SGPA">
              {student.semesters.map((s) => (
                <div key={s.sem} role="listitem" className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold tabular-nums">{s.sgpa}</span>
                  <div className="w-full max-w-14 rounded-t-md bg-primary/85" style={{ height: `${((s.sgpa - 6) / (maxSgpa - 6)) * 100}px` }} />
                  <span className="text-xs text-muted-foreground">Sem {s.sem}</span>
                </div>
              ))}
              {student.semesters.length === 0 && <p className="w-full self-center text-center text-sm text-muted-foreground">No semester records available.</p>}
            </div>
            <div className="mt-5 flex flex-col divide-y">
              {student.education.map((e) => (
                <div key={e.level} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.level}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.institution} · {e.period}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{e.score}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Skills">
            {account?.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {account.skills.map((skill) => <Chip key={skill}>{skill}</Chip>)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills added yet. Edit your profile to enter skills manually or upload a resume to detect them.</p>
            )}
          </Panel>

          <Panel
            title="Internships"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'my-internships' })}>
                View all
              </Button>
            }
          >
            <ul className="flex flex-col gap-3">
              {myInternships.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                      <Briefcase className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {m.role} · {m.company}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.period} · Mentor {m.mentor}
                      </p>
                    </div>
                  </div>
                  <VerifyBadge status={m.certificateStatus ?? m.offerStatus} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Projects">
            <ul className="grid gap-3 sm:grid-cols-2">
              {student.projects.map((p) => (
                <li key={p.title} className="flex flex-col gap-2 rounded-lg border p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <FolderGit2 className="size-4 text-primary" aria-hidden="true" />
                    {p.title}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{p.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tech.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid gap-6 sm:grid-cols-2">
            <Panel title="Certifications">
              <ul className="flex flex-col gap-3">
                {student.certifications.map((c) => (
                  <li key={c.name} className="flex gap-3">
                    <Award className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.issuer} · {c.year}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Achievements">
              <ul className="flex flex-col gap-3">
                {student.achievements.map((a) => (
                  <li key={a} className="flex gap-3 text-sm">
                    <Trophy className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}
