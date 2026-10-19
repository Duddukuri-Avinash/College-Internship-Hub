'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowRight, Check, Circle, FileText, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bar, PageHeader, Panel, selectClass } from '@/components/shared'
import { Field, TagInput } from '@/components/student/form-bits'
import { branches } from '@/lib/branches'
import type { View } from '@/components/app-shell'
import { cn } from '@/lib/utils'
import { useStudentAccount } from '@/components/student/student-account-provider'
import { extractResumeSkills } from '@/lib/resume-skills'

const DOMAINS = ['Data Analytics', 'Data Science / ML', 'Web Development', 'Software Engineering', 'Cloud / DevOps', 'Cybersecurity', 'Embedded / IoT', 'Core Engineering']
const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

type Form = {
  branch: string
  year: string
  section: string
  cgpa: string
  skills: string[]
  languages: string[]
  tools: string[]
  certifications: string[]
  linkedin: string
  github: string
  domain: string
  mode: string
  location: string
  resume: string
}

const empty: Form = { branch: '', year: '', section: '', cgpa: '', skills: [], languages: [], tools: [], certifications: [], linkedin: '', github: '', domain: '', mode: '', location: '', resume: '' }

export function Onboarding({ navigate, firstLogin, name }: { navigate: (v: View) => void; firstLogin: boolean; name?: string }) {
  const { account, resume: savedResume, loading, updateStudentDetails, uploadResume } = useStudentAccount()
  const [f, setF] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!account) return
    setF((current) => ({
      ...current,
      branch: account.branch === 'Unassigned' ? '' : account.branch,
      year: account.year > 0 ? String(account.year) : '',
      section: account.section === 'Unassigned' ? '' : account.section,
      cgpa: account.cgpa == null ? '' : String(account.cgpa),
      skills: account.skills,
      languages: account.languages,
      tools: account.tools,
      certifications: account.certifications,
      linkedin: account.linkedin,
      github: account.github,
      domain: account.domain,
      mode: account.mode,
      location: account.location,
      resume: savedResume?.fileName ?? current.resume,
    }))
  }, [account, savedResume])
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))

  const checklist = useMemo(
    () => [
      { label: 'Branch, year and section', done: !!(f.branch && f.year && f.section) },
      { label: 'Skills', done: f.skills.length > 0 },
      { label: 'Programming languages', done: f.languages.length > 0 },
      { label: 'Tools', done: f.tools.length > 0 },
      { label: 'Certifications', done: f.certifications.length > 0 },
      { label: 'LinkedIn and GitHub', done: !!(f.linkedin.trim() && f.github.trim()) },
      { label: 'Internship preferences', done: !!(f.domain && f.mode && f.location.trim()) },
      { label: 'Resume', done: !!f.resume },
    ],
    [f],
  )
  const doneCount = checklist.filter((c) => c.done).length
  const pct = Math.round((doneCount / checklist.length) * 100)

  async function onResume(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return void toast.error('Please upload a PDF or DOCX file')
    if (file.size > 5 * 1024 * 1024) return void toast.error('File is too large. Maximum size is 5 MB')
    try {
      await uploadResume(file)
      set('resume', file.name)
      const detectedSkills = await extractResumeSkills(file)
      if (detectedSkills.length) {
        setF((current) => ({ ...current, resume: file.name, skills: [...new Set([...current.skills, ...detectedSkills])] }))
        toast.success(`Resume uploaded. Detected ${detectedSkills.length} skill${detectedSkills.length === 1 ? '' : 's'}; review and save them below.`)
      } else {
        toast.success('Resume uploaded. No recognized skills were found; enter them manually below.')
      }
    } catch (error) {
      console.error('Unable to upload resume:', error)
      toast.error(error instanceof Error ? `Resume uploaded, but skill detection failed: ${error.message}` : 'Resume uploaded, but skill detection failed.')
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateStudentDetails({
        branch: f.branch,
        year: Number(f.year),
        section: f.section,
        cgpa: f.cgpa === '' ? null : Number(f.cgpa),
        skills: f.skills,
        languages: f.languages,
        tools: f.tools,
        certifications: f.certifications,
        linkedin: f.linkedin,
        github: f.github,
        domain: f.domain,
        mode: f.mode,
        location: f.location,
      })
      toast.success('Profile details saved to Supabase.')
      navigate(f.resume ? { name: 'resume-analysis' } : { name: 'student-dashboard' })
    } catch (error) {
      console.error('Unable to save student academic details:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to save academic details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={firstLogin ? `Welcome${name ? `, ${name.split(' ')[0]}` : ''}. Set up your profile` : 'Edit Profile'}
        description="Your academic details, skills, links, preferences, and resume are saved to your student account."
      />

      {firstLogin && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-accent p-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-pretty text-accent-foreground">Enter your details and save them to your student account.</p>
        </div>
      )}

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Academic details">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Branch" htmlFor="ob-branch">
                <select id="ob-branch" className={selectClass} value={f.branch} onChange={(e) => set('branch', e.target.value)} required disabled={loading}>
                  <option value="">Select</option>
                  {branches.map((branch) => (
                    <option key={branch.code} value={branch.code}>{branch.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Year" htmlFor="ob-year">
                <select id="ob-year" className={selectClass} value={f.year} onChange={(e) => set('year', e.target.value)} required>
                  <option value="">Select</option>
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Section" htmlFor="ob-section">
                <select id="ob-section" className={selectClass} value={f.section} onChange={(e) => set('section', e.target.value)} required>
                  <option value="">Select</option>
                  {['A', 'B', 'C', 'D'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="CGPA" htmlFor="ob-cgpa" hint="Enter a value from 0 to 10.">
                <Input id="ob-cgpa" type="number" min="0" max="10" step="0.01" inputMode="decimal" value={f.cgpa ?? ''} onChange={(e) => set('cgpa', e.target.value)} placeholder="e.g. 8.25" className="h-9" />
              </Field>
            </div>
          </Panel>

          <Panel title="Skills & credentials">
            <div className="flex flex-col gap-4">
              <Field label="Skills" htmlFor="ob-skills" hint="Press Enter or comma to add.">
                <TagInput id="ob-skills" value={f.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Data Analysis" suggestions={['Data Analysis', 'Machine Learning', 'Problem Solving', 'REST APIs', 'Statistics']} />
              </Field>
              <Field label="Programming languages" htmlFor="ob-langs">
                <TagInput id="ob-langs" value={f.languages} onChange={(v) => set('languages', v)} placeholder="e.g. Python" suggestions={['Python', 'Java', 'C++', 'JavaScript', 'SQL', 'R']} />
              </Field>
              <Field label="Tools" htmlFor="ob-tools">
                <TagInput id="ob-tools" value={f.tools} onChange={(v) => set('tools', v)} placeholder="e.g. Git" suggestions={['Git', 'Power BI', 'Excel', 'Docker', 'VS Code', 'Jupyter']} />
              </Field>
              <Field label="Certifications" htmlFor="ob-certs">
                <TagInput id="ob-certs" value={f.certifications} onChange={(v) => set('certifications', v)} placeholder="e.g. NPTEL Python for Data Science" />
              </Field>
            </div>
          </Panel>

          <Panel title="Links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="LinkedIn" htmlFor="ob-li">
                <Input id="ob-li" value={f.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/your-name" className="h-9" />
              </Field>
              <Field label="GitHub" htmlFor="ob-gh">
                <Input id="ob-gh" value={f.github} onChange={(e) => set('github', e.target.value)} placeholder="github.com/your-handle" className="h-9" />
              </Field>
            </div>
          </Panel>

          <Panel title="Internship preferences">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Preferred domain" htmlFor="ob-domain">
                <select id="ob-domain" className={selectClass} value={f.domain} onChange={(e) => set('domain', e.target.value)}>
                  <option value="">Select</option>
                  {DOMAINS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mode" htmlFor="ob-mode">
                <select id="ob-mode" className={selectClass} value={f.mode} onChange={(e) => set('mode', e.target.value)}>
                  <option value="">Select</option>
                  <option>Remote</option>
                  <option>On-site</option>
                  <option>Hybrid</option>
                </select>
              </Field>
              <Field label="Preferred location" htmlFor="ob-loc">
                <Input id="ob-loc" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Hyderabad" className="h-9" />
              </Field>
            </div>
          </Panel>

          <Panel title="Resume">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50">
              {f.resume ? <FileText className="size-8 text-primary" aria-hidden="true" /> : <Upload className="size-8 text-muted-foreground" aria-hidden="true" />}
              <span className="text-sm font-medium">{f.resume || 'Upload your resume'}</span>
              <span className="text-xs text-muted-foreground">{f.resume ? 'Click to replace file' : 'PDF or DOCX, up to 5 MB'}</span>
              <input type="file" accept=".pdf,.docx" className="sr-only" aria-label="Upload resume" onChange={(event) => { void onResume(event) }} />
            </label>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Profile completion">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold tabular-nums" aria-live="polite">
                {pct}%
              </span>
              <span className="text-xs text-muted-foreground">
                {doneCount} of {checklist.length} sections
              </span>
            </div>
            <Bar value={pct} tone={pct === 100 ? 'success' : 'primary'} className="mt-3" />
            <ul className="mt-4 flex flex-col gap-2">
              {checklist.map((c) => (
                <li key={c.label} className={cn('flex items-center gap-2 text-sm', c.done ? 'text-foreground' : 'text-muted-foreground')}>
                  {c.done ? <Check className="size-4 text-success" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
                  {c.label}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving || loading}>
                {saving ? 'Saving…' : firstLogin ? 'Save & continue' : 'Save changes'} <ArrowRight />
              </Button>
              {firstLogin && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate({ name: 'student-dashboard' })}>
                  Skip for now
                </Button>
              )}
            </div>
          </Panel>
        </div>
      </form>
    </>
  )
}
