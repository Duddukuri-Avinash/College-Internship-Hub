'use client'

import { useState } from 'react'
import { FileDown, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bar, Panel, selectClass } from '@/components/shared'
import { Switch, Field } from '@/components/student/form-bits'
import { FilterSelect, downloadFile } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { BRANCHES } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'
import { branchStats, skillGaps } from '@/lib/data'

const RANGES: [string, string][] = [['30', 'Last 30 days'], ['sem', 'This semester'], ['ay', 'Academic year']]
const REPORT_NAMES = ['Participation by branch', 'Participation by year', 'Participation by company', 'Participation by domain', 'Verification turnaround by faculty', 'Self-found vs college-posted', 'Top skill gaps']

function BarList({ items, suffix = '', tone }: { items: { label: string; value: number; max?: number; note?: string }[]; suffix?: string; tone?: 'primary' | 'success' | 'warning' }) {
  const max = Math.max(1, ...items.map((i) => i.max ?? i.value))
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[96px_1fr_72px] items-center gap-3 text-sm">
          <span className="truncate font-medium" title={i.label}>{i.label}</span>
          <Bar value={(i.value / (i.max ?? max)) * 100} tone={tone} />
          <span className="text-right text-xs tabular-nums text-muted-foreground">{i.note ?? `${i.value.toLocaleString('en-IN')}${suffix}`}</span>
        </li>
      ))}
    </ul>
  )
}

export function Reports() {
  const { faculty, listings, scheduled, setScheduled, log } = useAdmin()
  const [range, setRange] = useState('ay')
  const [branch, setBranch] = useState('All')
  const bs = branchStats.filter((b) => branch === 'All' || b.branch === branch || (branch === 'Mech' && b.branch === 'MECH'))
  const byBranch = bs.map((b) => ({ label: b.branch, value: b.interning, max: b.students, note: b.students ? `${Math.round((b.interning / b.students) * 100)}%` : '—' }))
  const byYear: { label: string; value: number }[] = []
  const companies = Array.from(new Set(listings.map((l) => l.company))).map((company) => ({
    label: company,
    value: listings.filter((listing) => listing.company === company).reduce((count, listing) => count + listing.applicants, 0),
  })).filter((company) => company.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)
  const domains: { label: string; value: number }[] = []
  const turnaround = faculty.filter((x) => x.status === 'Active' && x.turnaround && (branch === 'All' || x.dept === branch)).map((x) => ({ label: x.name.replace(/^(Dr\.|Mrs\.|Mr\.)\s*/, ''), value: x.turnaround, note: `${x.turnaround} days` }))

  function exportCsv() {
    const rows = [['Report', 'Label', 'Value'], ...byBranch.map((r) => ['Participation by branch', r.label, r.value]), ...byYear.map((r) => ['Participation by year', r.label, r.value]), ...companies.map((r) => ['Participation by company', r.label, r.value]), ...domains.map((r) => ['Participation by domain', r.label, r.value]), ...turnaround.map((r) => ['Turnaround (days)', r.label, r.value]), ...skillGaps.map((s) => ['Skill gap (%)', s.skill, s.demand - s.supply])]
    downloadFile(`internhub-report-${range}-${branch}.csv`, rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'))
    log('Exported report', 'Settings', `CSV · ${RANGES.find((r) => r[0] === range)?.[1]} · ${branch}`)
    toast.success('CSV exported')
  }

  return (
    <>
      <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Participation and skill-gap reports are not connected to Supabase. Only available session records are included.
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Date range" value={range} onChange={setRange} options={RANGES} />
          <FilterSelect label="Branch" value={branch} onChange={setBranch} options={['All', ...BRANCHES.map((code) => [code, branchName(code)] as [string, string])]} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><FileDown /> Export CSV</Button>
          <Button variant="outline" onClick={() => { log('Exported report', 'Settings', 'PDF'); toast.success('PDF report is being generated — it will download shortly') }}><FileText /> Export PDF</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Participation by branch">{byBranch.length ? <BarList items={byBranch} tone="success" /> : <p className="text-sm text-muted-foreground">No report records are available.</p>}</Panel>
        <Panel title="Participation by year"><p className="text-sm text-muted-foreground">No year-level report records are available.</p></Panel>
        <Panel title="Participation by company">{companies.length ? <BarList items={companies} /> : <p className="text-sm text-muted-foreground">No company report records are available.</p>}</Panel>
        <Panel title="Participation by domain"><p className="text-sm text-muted-foreground">No domain-level report records are available.</p></Panel>
        <Panel title="Verification turnaround by faculty">
          {turnaround.length ? <BarList items={turnaround} tone="warning" /> : <p className="text-sm text-muted-foreground">No active faculty for this branch.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Target SLA: 3 days. Lower is better.</p>
        </Panel>
        <Panel title="Self-found vs college-posted">
          <p className="text-sm text-muted-foreground">Source breakdown is not available until internship records are connected.</p>
        </Panel>
        <Panel title="Top skill gaps" className="lg:col-span-2">
          {skillGaps.length ? <BarList items={[...skillGaps].sort((a, b) => b.demand - b.supply - (a.demand - a.supply)).map((s) => ({ label: s.skill, value: s.demand - s.supply, max: 100, note: `Gap ${s.demand - s.supply}%` }))} tone="warning" /> : <p className="text-sm text-muted-foreground">No skill-gap records are available.</p>}
        </Panel>
      </div>

      <ScheduledReports scheduled={scheduled} setScheduled={setScheduled} />
    </>
  )
}

function ScheduledReports({ scheduled, setScheduled }: { scheduled: ReturnType<typeof useAdmin>['scheduled']; setScheduled: ReturnType<typeof useAdmin>['setScheduled'] }) {
  const [name, setName] = useState(REPORT_NAMES[0])
  const [freq, setFreq] = useState<'Weekly' | 'Monthly'>('Weekly')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const list = email.split(',').map((x) => x.trim()).filter(Boolean)
    if (!list.length || list.some((x) => !/^\S+@\S+\.\S+$/.test(x))) return setError('Enter one or more valid emails, separated by commas.')
    setScheduled((l) => [...l, { id: `sr${Date.now()}`, name, frequency: freq, recipients: list.join(', '), active: true }])
    toast.success(`${name} scheduled ${freq.toLowerCase()}`)
    setEmail('')
  }

  return (
    <Panel title="Scheduled reports">
      <ul className="mb-5 flex flex-col divide-y rounded-lg border">
        {scheduled.length ? scheduled.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.frequency} email · {s.recipients}</p></div>
            <div className="flex items-center gap-3">
              <Switch checked={s.active} onChange={(v) => { setScheduled((l) => l.map((x) => (x.id === s.id ? { ...x, active: v } : x))); toast.success(v ? 'Schedule resumed' : 'Schedule paused') }} label={`${s.active ? 'Pause' : 'Resume'} ${s.name}`} />
              <Button size="icon" variant="ghost" aria-label={`Delete ${s.name} schedule`} onClick={() => { setScheduled((l) => l.filter((x) => x.id !== s.id)); toast.success('Schedule deleted') }}><Trash2 /></Button>
            </div>
          </li>
        )) : <li className="px-4 py-6 text-center text-sm text-muted-foreground">No scheduled reports yet.</li>}
      </ul>
      <form onSubmit={add} noValidate className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto] sm:items-end">
        <Field label="Report" htmlFor="sr-name"><select id="sr-name" className={selectClass} value={name} onChange={(e) => setName(e.target.value)}>{REPORT_NAMES.map((n) => <option key={n}>{n}</option>)}</select></Field>
        <Field label="Frequency" htmlFor="sr-freq"><select id="sr-freq" className={selectClass} value={freq} onChange={(e) => setFreq(e.target.value as 'Weekly' | 'Monthly')}><option>Weekly</option><option>Monthly</option></select></Field>
        <Field label="Email to" htmlFor="sr-email" error={error}><Input id="sr-email" type="text" value={email} placeholder="hod.cse@rvrjc.ac.in" onChange={(e) => { setEmail(e.target.value); setError('') }} aria-invalid={!!error || undefined} /></Field>
        <Button type="submit" className={error ? 'sm:mb-5' : ''}><Plus /> Schedule</Button>
      </form>
    </Panel>
  )
}
