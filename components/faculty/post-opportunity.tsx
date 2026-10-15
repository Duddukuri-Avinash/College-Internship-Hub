'use client'

import { useMemo, useState } from 'react'
import { Bell, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Modal, PageHeader, Panel, selectClass } from '@/components/shared'
import type { View } from '@/components/app-shell'
import { useFacultyStore } from '@/components/faculty/faculty-store'
import { branches, branchStats, type Mode } from '@/lib/data'
import { TODAY, type OppStatus } from '@/lib/faculty-data'
import { branchName } from '@/lib/branches'

type FormState = { company: string; role: string; duration: string; mode: Mode; stipend: string; deadline: string; skills: string; description: string; link: string }
type Errors = Partial<Record<keyof FormState | 'eligibility', string>>

const empty: FormState = { company: '', role: '', duration: '', mode: 'On-site', stipend: '', deadline: '', skills: '', description: '', link: '' }

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive" role="alert">{msg}</p> : null
}

export function PostOpportunity({ editId, navigate }: { editId?: string; navigate: (v: View) => void }) {
  const { opportunities, saveOpportunity } = useFacultyStore()
  const existing = editId ? opportunities.find((o) => o.id === editId) : undefined
  const [form, setForm] = useState<FormState>(() =>
    existing
      ? { company: existing.company, role: existing.role, duration: existing.duration, mode: existing.mode, stipend: existing.stipend, deadline: existing.deadline, skills: existing.skills, description: existing.description, link: existing.link }
      : empty,
  )
  const [selected, setSelected] = useState<string[]>(existing?.branches ?? ['CSE', 'IT'])
  const [years, setYears] = useState<number[]>(existing?.years ?? [3])
  const [cgpa, setCgpa] = useState(existing?.minCgpa ?? 7)
  const [errors, setErrors] = useState<Errors>({})
  const [confirm, setConfirm] = useState(false)

  const eligible = useMemo(() => {
    const base = branchStats.filter((b) => selected.some((s) => s.startsWith(b.branch) || b.branch.startsWith(s))).reduce((n, b) => n + b.students, 0)
    return Math.round((base / 4) * years.length * Math.max(0.2, 1 - (cgpa - 6) * 0.18))
  }, [selected, years, cgpa])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const validate = (full: boolean) => {
    const e: Errors = {}
    if (!form.company.trim()) e.company = 'Company is required.'
    if (!form.role.trim()) e.role = 'Role is required.'
    if (full) {
      if (!form.duration.trim()) e.duration = 'Duration is required.'
      if (!form.deadline) e.deadline = 'Choose an application deadline.'
      else if (form.deadline < TODAY) e.deadline = 'The deadline cannot be in the past.'
      if (form.stipend && Number(form.stipend) < 0) e.stipend = 'Stipend cannot be negative.'
      if (!selected.length || !years.length) e.eligibility = 'Select at least one branch and one year.'
    }
    if (form.link && !/^https?:\/\/\S+\.\S+/.test(form.link)) e.link = 'Enter a valid URL starting with https://'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (status: OppStatus) => {
    saveOpportunity({
      id: existing?.id ?? `o${Date.now()}`,
      ...form,
      company: form.company.trim(),
      role: form.role.trim(),
      branches: selected,
      years: [...years].sort(),
      minCgpa: cgpa,
      status,
      eligible,
      interested: existing?.interested ?? [],
      postedOn: existing?.postedOn ?? TODAY,
    })
  }

  const isLive = existing?.status === 'Active'

  return (
    <>
      <PageHeader
        title={existing ? 'Edit Opportunity' : 'Post College Opportunity'}
        description={existing ? `${existing.company} · ${existing.role}` : 'Publish an internship and automatically notify every eligible student.'}
      />
      <form
        noValidate
        className="grid gap-6 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (validate(true)) setConfirm(true)
        }}
      >
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Opportunity details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="c">Company</Label><Input id="c" value={form.company} onChange={set('company')} placeholder="Company name" aria-invalid={!!errors.company || undefined} /><FieldError msg={errors.company} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="r">Role</Label><Input id="r" value={form.role} onChange={set('role')} placeholder="e.g. Software Engineering Intern" aria-invalid={!!errors.role || undefined} /><FieldError msg={errors.role} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="d">Duration</Label><Input id="d" value={form.duration} onChange={set('duration')} placeholder="8 weeks" aria-invalid={!!errors.duration || undefined} /><FieldError msg={errors.duration} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="m">Mode</Label><select id="m" value={form.mode} onChange={set('mode')} className={selectClass}><option>On-site</option><option>Remote</option><option>Hybrid</option></select></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="s">Stipend (₹ / month)</Label><Input id="s" type="number" min={0} value={form.stipend} onChange={set('stipend')} placeholder="15000" aria-invalid={!!errors.stipend || undefined} /><FieldError msg={errors.stipend} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="dl">Application deadline</Label><Input id="dl" type="date" min={TODAY} value={form.deadline} onChange={set('deadline')} aria-invalid={!!errors.deadline || undefined} /><FieldError msg={errors.deadline} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="sk">Required skills</Label><Input id="sk" value={form.skills} onChange={set('skills')} placeholder="Java, SQL, Spring Boot" /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={4} value={form.description} onChange={set('description')} placeholder="Responsibilities, selection process…" /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="link">Application link</Label><Input id="link" type="url" value={form.link} onChange={set('link')} placeholder="https://" aria-invalid={!!errors.link || undefined} /><FieldError msg={errors.link} /></div>
            </div>
          </Panel>
          <Panel title="Eligibility criteria">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Branches</legend>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm has-[[data-checked]]:border-primary has-[[data-checked]]:bg-accent">
                    <Checkbox checked={selected.includes(b)} onCheckedChange={() => { setSelected((s) => toggle(s, b)); setErrors((x) => ({ ...x, eligibility: undefined })) }} /> {branchName(b)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium">Year of study</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((y) => (
                  <label key={y} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm has-[[data-checked]]:border-primary has-[[data-checked]]:bg-accent">
                    <Checkbox checked={years.includes(y)} onCheckedChange={() => { setYears((s) => toggle(s, y)); setErrors((x) => ({ ...x, eligibility: undefined })) }} /> Year {y}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-2"><FieldError msg={errors.eligibility} /></div>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="cg">Minimum CGPA: {cgpa.toFixed(1)}</Label>
              <input id="cg" type="range" min={5} max={9.5} step={0.5} value={cgpa} onChange={(e) => setCgpa(Number(e.target.value))} className="accent-primary" />
            </div>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Eligible students">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-success/10 text-success"><Users className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="text-3xl font-semibold tabular-nums" aria-live="polite">{eligible}</p>
                <p className="text-xs text-muted-foreground">auto-identified from student profiles</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {selected.length ? selected.join(', ') : 'No branches'} · Year {[...years].sort().join(', ') || '—'} · CGPA {cgpa}+
            </p>
            <Button type="submit" className="mt-5 w-full">
              <Bell /> {isLive ? 'Save changes' : 'Publish & notify students'}
            </Button>
            {!isLive && (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  if (!validate(false)) return
                  save('Draft')
                  toast.success('Saved as draft', { description: 'Find it under Manage Opportunities.' })
                  navigate({ name: 'faculty-opportunities' })
                }}
              >
                <Save /> Save as draft
              </Button>
            )}
          </Panel>
        </div>
      </form>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={isLive ? 'Save changes to this opportunity?' : 'Publish this opportunity?'}
        description={isLive ? 'The live listing will be updated for all eligible students.' : `${eligible} eligible students will receive an in-app and email notification.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirm(false)
                save('Active')
                toast.success(isLive ? 'Opportunity updated' : 'Opportunity published', { description: isLive ? form.company : `${eligible} students notified` })
                navigate({ name: 'faculty-opportunities' })
              }}
            >
              {isLive ? 'Save changes' : 'Publish'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">The listing will appear with a &quot;College Opportunity&quot; badge for eligible students of R.V.R &amp; J.C College of Engineering.</p>
      </Modal>
    </>
  )
}
