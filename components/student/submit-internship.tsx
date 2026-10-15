'use client'

import { useState } from 'react'
import { Check, Clock, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileDrop, PageHeader, Panel, VerifyBadge, selectClass } from '@/components/shared'
import { Field, TagInput } from '@/components/student/form-bits'
import { formatDate } from '@/lib/data'
import type { View } from '@/components/app-shell'
import { cn } from '@/lib/utils'

type Form = {
  company: string
  role: string
  description: string
  skills: string[]
  eligibility: string
  location: string
  mode: string
  duration: string
  stipend: string
  url: string
  deadline: string
  evidenceType: string
  evidenceFile: string
}

const blank: Form = { company: '', role: '', description: '', skills: [], eligibility: '', location: '', mode: 'On-site', duration: '', stipend: '', url: '', deadline: '', evidenceType: 'Offer letter', evidenceFile: '' }

const timeline = [
  { label: 'Submitted', note: 'Sent to your faculty coordinator', done: true },
  { label: 'Faculty review', note: 'Usually within 3 working days', done: false },
  { label: 'Published to students', note: 'Listed as Self-Found once verified', done: false },
]

export function SubmitInternship({ navigate }: { navigate: (v: View) => void }) {
  const [f, setF] = useState<Form>(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<{ ref: string; form: Form; at: string } | null>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.company.trim()) er.company = 'Required'
    if (!f.role.trim()) er.role = 'Required'
    if (f.description.trim().length < 20) er.description = 'Add at least a short description (20 characters).'
    if (!f.skills.length) er.skills = 'Add at least one skill.'
    if (!f.location.trim()) er.location = 'Required'
    if (!f.duration.trim()) er.duration = 'Required'
    if (f.url && !/^https?:\/\/.+\..+/.test(f.url.trim())) er.url = 'Enter a full link starting with https://'
    if (!f.deadline) er.deadline = 'Required'
    if (!f.evidenceFile) er.evidence = 'Upload evidence so faculty can verify this internship.'
    setErrors(er)
    if (Object.keys(er).length) return
    setSubmitted({ ref: `SF-${Math.floor(1000 + Math.random() * 9000)}`, form: f, at: new Date().toISOString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    const s = submitted.form
    return (
      <>
        <PageHeader title="Self-Found Internship Submitted" description="Your faculty coordinator will verify the details and evidence." />
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-primary" aria-hidden="true">
                  {s.company.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-semibold">{s.role}</p>
                  <p className="text-sm text-muted-foreground">{s.company}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                  <Clock className="size-3" aria-hidden="true" /> Pending Verification
                </span>
                <span className="text-xs text-muted-foreground">
                  Ref {submitted.ref} · {formatDate(submitted.at)}
                </span>
              </div>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t pt-5 text-sm sm:grid-cols-2">
              {[
                ['Location', `${s.location} · ${s.mode}`],
                ['Duration', s.duration],
                ['Stipend', s.stipend ? `₹${Number(s.stipend).toLocaleString('en-IN')} / month` : 'Unpaid / not stated'],
                ['Deadline', formatDate(s.deadline)],
                ['Skills', s.skills.join(', ')],
                ['Eligibility', s.eligibility || 'Not specified'],
                ['Evidence', `${s.evidenceType}: ${s.evidenceFile}`],
                ['Application link', s.url || 'Not provided'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="break-words font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setSubmitted(null)
                  setF(blank)
                }}
              >
                <Plus /> Submit another
              </Button>
              <Button variant="outline" onClick={() => navigate({ name: 'my-internships' })}>
                Go to My Internships
              </Button>
            </div>
          </Panel>

          <Panel title="What happens next">
            <ol className="flex flex-col gap-4">
              {timeline.map((t, i) => (
                <li key={t.label} className="flex gap-3">
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold', t.done ? 'border-success bg-success text-success-foreground' : i === 1 ? 'border-primary bg-accent text-primary' : 'border-border text-muted-foreground')}>
                    {t.done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.note}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              Companies never log in to InternHub. Verification is done only by college faculty.
            </div>
          </Panel>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Submit Self-Found Internship" description="Found an opportunity yourself? Share it for faculty verification so other eligible students can see it." />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Internship details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" htmlFor="sf-company" error={errors.company}>
                <Input id="sf-company" value={f.company} onChange={(e) => set('company', e.target.value)} placeholder="Company name" className="h-9" aria-invalid={!!errors.company || undefined} />
              </Field>
              <Field label="Role" htmlFor="sf-role" error={errors.role}>
                <Input id="sf-role" value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Backend Intern" className="h-9" aria-invalid={!!errors.role || undefined} />
              </Field>
              <Field label="Description" htmlFor="sf-desc" error={errors.description} className="sm:col-span-2">
                <Textarea id="sf-desc" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Responsibilities, team, selection process…" aria-invalid={!!errors.description || undefined} />
              </Field>
              <Field label="Skills required" htmlFor="sf-skills" error={errors.skills} className="sm:col-span-2" hint="Press Enter or comma to add.">
                <TagInput id="sf-skills" value={f.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Python, SQL" />
              </Field>
              <Field label="Eligibility" htmlFor="sf-elig" className="sm:col-span-2" hint="Branches, year, minimum CGPA or anything else the company asks for.">
                <Input id="sf-elig" value={f.eligibility} onChange={(e) => set('eligibility', e.target.value)} placeholder="e.g. CSE / IT, 3rd or 4th year, CGPA 7+" className="h-9" />
              </Field>
              <Field label="Location" htmlFor="sf-loc" error={errors.location}>
                <Input id="sf-loc" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Bengaluru" className="h-9" aria-invalid={!!errors.location || undefined} />
              </Field>
              <Field label="Mode" htmlFor="sf-mode">
                <select id="sf-mode" className={selectClass} value={f.mode} onChange={(e) => set('mode', e.target.value)}>
                  <option>On-site</option>
                  <option>Remote</option>
                  <option>Hybrid</option>
                </select>
              </Field>
              <Field label="Duration" htmlFor="sf-dur" error={errors.duration}>
                <Input id="sf-dur" value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 8 weeks" className="h-9" aria-invalid={!!errors.duration || undefined} />
              </Field>
              <Field label="Stipend (₹ / month)" htmlFor="sf-stipend">
                <Input id="sf-stipend" type="number" min={0} value={f.stipend} onChange={(e) => set('stipend', e.target.value)} placeholder="15000" className="h-9" />
              </Field>
              <Field label="Application URL" htmlFor="sf-url" error={errors.url}>
                <Input id="sf-url" type="url" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" className="h-9" aria-invalid={!!errors.url || undefined} />
              </Field>
              <Field label="Deadline" htmlFor="sf-deadline" error={errors.deadline}>
                <Input id="sf-deadline" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} className="h-9" aria-invalid={!!errors.deadline || undefined} />
              </Field>
            </div>
          </Panel>

          <Panel title="Evidence">
            <div className="flex flex-col gap-4">
              <Field label="Evidence type" htmlFor="sf-evtype">
                <select id="sf-evtype" className={selectClass} value={f.evidenceType} onChange={(e) => set('evidenceType', e.target.value)}>
                  <option>Offer letter</option>
                  <option>Email from company</option>
                  <option>Official job posting screenshot</option>
                  <option>Application confirmation</option>
                </select>
              </Field>
              <div className="flex flex-col gap-1.5">
                <FileDrop label="Upload evidence" hint="PDF, JPG or PNG up to 5 MB" fileName={f.evidenceFile || undefined} onFile={(file) => set('evidenceFile', file.name)} />
                {errors.evidence && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.evidence}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Review before you send">
            <div className="flex items-center gap-2">
              <VerifyBadge status="Pending" />
              <span className="text-xs text-muted-foreground">after submission</span>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>Your faculty coordinator reviews the details and evidence.</li>
              <li>Verified listings appear to eligible students as Self-Found.</li>
              <li>The company does not need an account or portal.</li>
            </ul>
            <Button type="submit" className="mt-5 w-full">
              Submit for verification
            </Button>
          </Panel>
        </div>
      </form>
    </>
  )
}
