'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Info, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Panel, selectClass } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { Field, Switch } from '@/components/student/form-bits'
import { FilterSelect, Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin, type PlatformSettings, type TemplateKey } from '@/components/admin/admin-store'
import { templateSample, type Roadmap, type TicketStatus } from '@/lib/admin-data'

const TABS = ['General', 'Verification & SLA', 'Files & privacy', 'Notifications', 'AI & Learning', 'Support inbox'] as const

export function Settings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('General')
  const { tickets } = useAdmin()
  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Settings sections" counts={{ 'Support inbox': tickets.filter((t) => t.status === 'Open').length }} />
      {tab === 'General' && <General />}
      {tab === 'Verification & SLA' && <Sla />}
      {tab === 'Files & privacy' && <Privacy />}
      {tab === 'Notifications' && <Templates />}
      {tab === 'AI & Learning' && <AiLearning />}
      {tab === 'Support inbox' && <Support />}
    </>
  )
}

function useSave() {
  const { settings, setSettings, log } = useAdmin()
  return (next: Partial<PlatformSettings>, label: string) => {
    const changed = (Object.keys(next) as (keyof PlatformSettings)[]).filter((k) => String(settings[k]) !== String(next[k]))
    if (changed.length) log(`Updated ${label}`, 'Settings', label, Object.fromEntries(changed.map((k) => [k, String(settings[k])])), Object.fromEntries(changed.map((k) => [k, String(next[k])])))
    setSettings((s) => ({ ...s, ...next }))
    toast.success('Settings saved')
  }
}

function General() {
  const { settings } = useAdmin()
  const save = useSave()
  const [f, setF] = useState({ institution: settings.institution, academicYear: settings.academicYear, sla: String(settings.sla), maxFile: String(settings.maxFile) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <Panel title="Platform settings">
      <form
        className="grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const er: Record<string, string> = {}
          if (f.institution.trim().length < 3) er.institution = 'Enter the institution name.'
          if (!(Number(f.sla) >= 1 && Number(f.sla) <= 14)) er.sla = 'Between 1 and 14 days.'
          if (!(Number(f.maxFile) >= 1 && Number(f.maxFile) <= 25)) er.maxFile = 'Between 1 and 25 MB.'
          setErrors(er)
          if (!Object.keys(er).length) save({ institution: f.institution.trim(), academicYear: f.academicYear, sla: Number(f.sla), maxFile: Number(f.maxFile) }, 'platform settings')
        }}
      >
        <Field label="Institution name" htmlFor="cn" error={errors.institution}><Input id="cn" value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
        <Field label="Academic year" htmlFor="ay"><Input id="ay" value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></Field>
        <Field label="Verification SLA (days)" htmlFor="sla" error={errors.sla}><Input id="sla" type="number" value={f.sla} onChange={(e) => setF({ ...f, sla: e.target.value })} /></Field>
        <Field label="Max file size (MB)" htmlFor="mx" error={errors.maxFile}><Input id="mx" type="number" value={f.maxFile} onChange={(e) => setF({ ...f, maxFile: e.target.value })} /></Field>
        <Button type="submit" className="w-fit">Save settings</Button>
      </form>
    </Panel>
  )
}

function Sla() {
  const { settings } = useAdmin()
  const save = useSave()
  const [r, setR] = useState(String(settings.reminderDays))
  const [x, setX] = useState(String(settings.escalateDays))
  const [error, setError] = useState('')
  return (
    <Panel title="Verification SLA & escalation" className="max-w-2xl">
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const rn = Number(r), xn = Number(x)
          if (!(rn >= 1) || !(xn >= 1)) return setError('Both values must be at least 1 day.')
          if (xn <= rn) return setError('Escalation must come after the reminder.')
          setError('')
          save({ reminderDays: rn, escalateDays: xn }, 'escalation rules')
        }}
      >
        <p className="text-sm text-muted-foreground">Current SLA: <span className="font-medium text-foreground">{settings.sla} days</span> (change it under General).</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Remind the assigned faculty after</span>
          <Input aria-label="Reminder after days" type="number" min={1} className="w-20" value={r} onChange={(e) => setR(e.target.value)} />
          <span>days pending.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Escalate to admin after</span>
          <Input aria-label="Escalate after days" type="number" min={1} className="w-20" value={x} onChange={(e) => setX(e.target.value)} />
          <span>days pending.</span>
        </div>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <ol className="flex flex-col gap-1 border-l pl-4 text-xs text-muted-foreground">
          <li>Day 0 · Student submits document</li>
          <li>Day {r || '?'} · Reminder email to faculty</li>
          <li>Day {settings.sla} · SLA breached, shown in red on dashboards</li>
          <li>Day {x || '?'} · Escalated to admin queue</li>
        </ol>
        <Button type="submit" className="w-fit">Save rules</Button>
      </form>
    </Panel>
  )
}

const FILE_TYPES = ['PDF', 'JPG', 'PNG', 'DOCX', 'HEIC']

function Privacy() {
  const { settings } = useAdmin()
  const save = useSave()
  const [types, setTypes] = useState(settings.fileTypes)
  const [retention, setRetention] = useState(String(settings.retentionYears))
  const [hideCgpa, setHideCgpa] = useState(settings.hideCgpa)
  const [anon, setAnon] = useState(settings.anonymousExperiences)
  const [error, setError] = useState('')
  return (
    <Panel title="Files, retention & privacy" className="max-w-2xl">
      <form className="flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); if (!types.length) return setError('Allow at least one file type.'); setError(''); save({ fileTypes: types, retentionYears: Number(retention), hideCgpa, anonymousExperiences: anon }, 'file & privacy settings') }}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Allowed file types</legend>
          <div className="flex flex-wrap gap-4">{FILE_TYPES.map((t) => <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={types.includes(t)} onChange={(e) => { setTypes((l) => (e.target.checked ? [...l, t] : l.filter((x) => x !== t))); setError('') }} />{t}</label>)}</div>
          {error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
        </fieldset>
        <Field label="Data retention period" htmlFor="ret" hint="Documents of graduated students are deleted after this period." className="max-w-60">
          <select id="ret" className={selectClass} value={retention} onChange={(e) => setRetention(e.target.value)}>{[1, 3, 5, 7].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''} after graduation</option>)}</select>
        </Field>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Hide CGPA from other students</p><p className="text-xs text-muted-foreground">Faculty and admins can still see it.</p></div><Switch checked={hideCgpa} onChange={setHideCgpa} label="Hide CGPA from other students" /></div>
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Allow anonymous senior experiences</p><p className="text-xs text-muted-foreground">Admins can always see the real author.</p></div><Switch checked={anon} onChange={setAnon} label="Allow anonymous senior experiences" /></div>
        </div>
        <Button type="submit" className="w-fit">Save</Button>
      </form>
    </Panel>
  )
}

function Templates() {
  const { templates, setTemplates, settings, log } = useAdmin()
  const [key, setKey] = useState<TemplateKey>('approved')
  const [draft, setDraft] = useState(templates)
  const t = draft[key]
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => (k === 'college' ? settings.institution : templateSample[k] ?? `{${k}}`))
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Email & notification templates">
        <div className="flex flex-col gap-4">
          <FilterSelect label="Template" value={key} onChange={(v) => setKey(v as TemplateKey)} options={(Object.keys(draft) as TemplateKey[]).map((k) => [k, draft[k].label])} />
          <Field label="Subject" htmlFor="tp-sub"><Input id="tp-sub" value={t.subject} onChange={(e) => setDraft({ ...draft, [key]: { ...t, subject: e.target.value } })} /></Field>
          <Field label="Body" htmlFor="tp-body" hint="Variables: {name}, {document}, {faculty}, {company}, {reason}, {role}, {deadline}, {days}, {college}"><Textarea id="tp-body" rows={8} value={t.body} onChange={(e) => setDraft({ ...draft, [key]: { ...t, body: e.target.value } })} /></Field>
          <div className="flex gap-2">
            <Button onClick={() => { setTemplates(draft); log('Updated email template', 'Settings', t.label); toast.success(`${t.label} template saved`) }}>Save template</Button>
            <Button variant="outline" onClick={() => setDraft({ ...draft, [key]: templates[key] })}>Revert</Button>
          </div>
        </div>
      </Panel>
      <Panel title="Preview">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 text-sm"><p className="text-xs text-muted-foreground">Recipient preview</p><p className="mt-1 font-medium">{fill(t.subject)}</p></div>
          <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed">{fill(t.body)}</p>
        </div>
      </Panel>
    </div>
  )
}

function AiLearning() {
  const { settings, roadmaps, setRoadmaps, log } = useAdmin()
  const save = useSave()
  const toggles: [keyof PlatformSettings, string, string][] = [
    ['aiResume', 'AI Resume Analysis', 'Students get ATS-style feedback on uploaded resumes.'],
    ['aiRoadmap', 'Skill Roadmap', 'Role-based learning paths on the student dashboard.'],
    ['aiRecommendations', 'AI-based internship recommendations', 'Ranks listings by profile and skill match.'],
  ]
  function update(id: string, fn: (r: Roadmap) => Roadmap) {
    setRoadmaps((l) => l.map((r) => (r.id === id ? fn(r) : r)))
  }
  return (
    <>
      <Panel title="AI features">
        <p className="mb-4 flex gap-2 rounded-lg border border-primary/20 bg-accent p-3 text-sm text-accent-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          Resume analysis is guidance only and does not guarantee selection.
        </p>
        <ul className="flex flex-col gap-3">
          {toggles.map(([k, label, hint]) => (
            <li key={k} className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-medium">Enable {label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
              <Switch checked={settings[k] as boolean} onChange={(v) => save({ [k]: v }, label)} label={`Enable ${label}`} />
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">Role roadmaps</h2>
        <p className="text-sm text-muted-foreground">Shown to students under Skill Roadmap{settings.aiRoadmap ? '' : ' (currently disabled)'}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {roadmaps.map((r) => <RoadmapCard key={r.id} roadmap={r} onChange={(fn) => update(r.id, fn)} onPublish={(v) => { update(r.id, (x) => ({ ...x, published: v })); log(v ? 'Published roadmap' : 'Hid roadmap', 'Settings', r.role); toast.success(`${r.role} ${v ? 'published' : 'hidden'}`) }} />)}
      </div>
    </>
  )
}

function RoadmapCard({ roadmap: r, onChange, onPublish }: { roadmap: Roadmap; onChange: (fn: (r: Roadmap) => Roadmap) => void; onPublish: (v: boolean) => void }) {
  const [skill, setSkill] = useState('')
  const [error, setError] = useState('')
  const move = (i: number, d: -1 | 1) => onChange((x) => { const s = [...x.skills]; [s[i], s[i + d]] = [s[i + d], s[i]]; return { ...x, skills: s } })
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`rm-${r.id}`} className="sr-only">Roadmap name</Label>
        <Input id={`rm-${r.id}`} value={r.role} onChange={(e) => onChange((x) => ({ ...x, role: e.target.value }))} className="h-8 font-medium" />
        <div className="flex shrink-0 items-center gap-2">
          <Pill tone={r.published ? 'success' : 'neutral'}>{r.published ? 'Published' : 'Hidden'}</Pill>
          <Switch checked={r.published} onChange={onPublish} label={`${r.published ? 'Hide' : 'Publish'} ${r.role}`} />
        </div>
      </div>
      <ol className="flex flex-col gap-1.5">
        {r.skills.map((s, i) => (
          <li key={s} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
            <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
            <span className="flex-1">{s}</span>
            <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} aria-label={`Move ${s} up`} onClick={() => move(i, -1)}><ArrowUp /></Button>
            <Button size="icon" variant="ghost" className="size-7" disabled={i === r.skills.length - 1} aria-label={`Move ${s} down`} onClick={() => move(i, 1)}><ArrowDown /></Button>
            <Button size="icon" variant="ghost" className="size-7" aria-label={`Remove ${s}`} onClick={() => onChange((x) => ({ ...x, skills: x.skills.filter((y) => y !== s) }))}><X /></Button>
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          const v = skill.trim()
          if (!v) return setError('Enter a skill name.')
          if (r.skills.some((s) => s.toLowerCase() === v.toLowerCase())) return setError('Already in this roadmap.')
          onChange((x) => ({ ...x, skills: [...x.skills, v] }))
          setSkill('')
        }}
      >
        <div className="flex gap-2">
          <Input aria-label={`Add skill to ${r.role}`} placeholder="Add a skill" value={skill} onChange={(e) => { setSkill(e.target.value); setError('') }} className="h-8" />
          <Button type="submit" size="sm" variant="outline"><Plus /> Add</Button>
        </div>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      </form>
    </section>
  )
}

const ticketTone = { Open: 'warning', 'In progress': 'primary', Closed: 'neutral' } as const

function Support() {
  const { tickets, setTickets } = useAdmin()
  const [filter, setFilter] = useState('All')
  const rows = tickets.filter((t) => filter === 'All' || t.status === filter)
  return (
    <>
      <div className="flex justify-end"><FilterSelect label="Status" value={filter} onChange={setFilter} options={['All', 'Open', 'In progress', 'Closed']} /></div>
      <Table
        empty={{ icon: <Info />, title: 'Inbox is empty', description: 'No tickets with this status.' }}
        head={['From', 'Issue', 'Date', 'Status']}
        rows={rows.map((t) => [
          <span key="f" className="flex flex-col"><span className="font-medium">{t.from}</span><span className="text-xs text-muted-foreground">{t.role}</span></span>,
          <span key="s" className="flex flex-col"><span className="font-medium">{t.subject}</span><span className="max-w-96 text-xs text-muted-foreground">{t.body}</span></span>,
          <span key="d" className="whitespace-nowrap tabular-nums text-muted-foreground">{t.date}</span>,
          <div key="st" className="flex items-center gap-2">
            <Pill tone={ticketTone[t.status]}>{t.status}</Pill>
            <select aria-label={`Change status of ${t.subject}`} className="h-8 rounded-md border bg-card px-2 text-xs" value={t.status} onChange={(e) => { setTickets((l) => l.map((x) => (x.id === t.id ? { ...x, status: e.target.value as TicketStatus } : x))); toast.success(`Ticket marked ${e.target.value}`) }}>
              <option>Open</option><option>In progress</option><option>Closed</option>
            </select>
          </div>,
        ])}
      />
    </>
  )
}
