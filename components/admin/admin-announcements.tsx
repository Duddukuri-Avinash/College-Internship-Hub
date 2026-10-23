'use client'

import { useState } from 'react'
import { CalendarClock, Megaphone, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Panel, selectClass } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Confirm, FilterSelect, Table } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { BRANCHES, SECTIONS, YEARS, type AdminAnnouncement } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'

type Role = 'Students' | 'Faculty' | 'Everyone'
const statusTone = { Sent: 'success', Scheduled: 'primary', Draft: 'neutral' } as const

export function Announcements() {
  const { announcements, setAnnouncements, students, faculty, approvals, log } = useAdmin()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [role, setRole] = useState<Role>('Students')
  const [branches, setBranches] = useState<(typeof BRANCHES)[number][]>([])
  const [years, setYears] = useState<(typeof YEARS)[number][]>([])
  const [section, setSection] = useState('All')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [at, setAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('All')

  const matchesBranch = (branch: string) => branches.length === 0 || branches.includes(branch as (typeof BRANCHES)[number])
  const studentCount = students.filter((student) =>
    student.status === 'Active'
      && matchesBranch(student.branch)
      && (!years.length || years.includes(student.year as (typeof YEARS)[number]))
      && (section === 'All' || student.section === section),
  ).length
  const facultyCount = faculty.filter((member) =>
    member.status === 'Active'
      && approvals.some((approval) => approval.empId === member.empId && approval.status === 'Approved')
      && matchesBranch(member.dept),
  ).length
  const recipients = role === 'Students' ? studentCount : role === 'Faculty' ? facultyCount : studentCount + facultyCount
  const audience = [role, branches.length ? branches.join(', ') : 'All branches', role !== 'Faculty' && years.length ? `Years ${[...years].sort().join(', ')}` : null, role !== 'Faculty' && section !== 'All' ? `Section ${section}` : null].filter(Boolean).join(' · ')

  function validate(draft = false) {
    const e: Record<string, string> = {}
    if (title.trim().length < 5) e.title = 'Title must be at least 5 characters.'
    if (!draft && body.trim().length < 10) e.body = 'Write a message of at least 10 characters.'
    if (link && !/^https?:\/\/\S+\.\S+/.test(link)) e.link = 'Enter a full URL starting with https://'
    if (!draft && when === 'later' && (!at || new Date(at).getTime() <= Date.now())) e.at = 'Pick a future date and time.'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function save(status: AdminAnnouncement['status']) {
    if (status === 'Scheduled') {
      toast.error('Scheduled emails are not available while the app runs locally. Select Send now.')
      return
    }
    let delivered = 0
    let inAppSaved = 0
    let emailFailures = 0
    if (status === 'Sent') {
      setSending(true)
      try {
        const response = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            ...(link ? { link } : {}),
            role,
            branches,
            years,
            section,
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Announcement email could not be sent.')
        delivered = result.emailsSent
        inAppSaved = result.inAppSaved
        emailFailures = result.emailsFailed
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Announcement email could not be sent.')
        return
      } finally {
        setSending(false)
      }
    }

    const a: AdminAnnouncement = {
      id: `an${Date.now()}`, title: title.trim(), body: body.trim(), link: link || undefined, audience, recipients, status,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      ...(status === 'Sent' ? { recipients: delivered, delivered, opened: 0 } : {}),
    }
    setAnnouncements((l) => [a, ...l])
    if (status !== 'Draft') log('Sent announcement', 'Announcement', a.title, undefined, { audience, recipients: String(delivered) })
    toast.success(status === 'Sent' ? 'Announcement sent' : 'Draft saved', status === 'Sent' ? {
      description: `${inAppSaved} in-app notifications; ${delivered} emails${emailFailures ? `; ${emailFailures} email deliveries failed` : ''}.`,
    } : undefined)
    setTitle(''); setBody(''); setLink(''); setAt(''); setWhen('now'); setConfirming(false)
  }

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, v: T, on: boolean) => set((l) => (on ? [...l, v] : l.filter((x) => x !== v)))
  const history = announcements.filter((a) => filter === 'All' || a.status === filter)

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel title="New announcement">
          <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); if (validate()) setConfirming(true) }}>
            <Field label="Title" htmlFor="at" error={errors.title}><Input id="at" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer internship drive registrations open" aria-invalid={!!errors.title || undefined} /></Field>
            <Field label="Message" htmlFor="ab" error={errors.body}><Textarea id="ab" rows={4} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body || undefined} /></Field>
            <Field label="Attach a link (optional)" htmlFor="al" error={errors.link}><Input id="al" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://rvrjc.ac.in/placements" aria-invalid={!!errors.link || undefined} /></Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Role" htmlFor="aud"><select id="aud" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as Role)}><option>Students</option><option>Faculty</option><option>Everyone</option></select></Field>
              <Field label="Section" htmlFor="asec"><select id="asec" className={selectClass} value={section} disabled={role === 'Faculty'} onChange={(e) => setSection(e.target.value)}><option>All</option>{SECTIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Branches <span className="font-normal text-muted-foreground">(none = all)</span></legend>
              <div className="flex flex-wrap gap-3">{BRANCHES.map((b) => <label key={b} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={branches.includes(b)} onChange={(e) => toggle(setBranches, b, e.target.checked)} />{branchName(b)}</label>)}</div>
            </fieldset>
            <fieldset disabled={role === 'Faculty'} className="disabled:opacity-50">
              <legend className="mb-2 text-sm font-medium">Years <span className="font-normal text-muted-foreground">(none = all)</span></legend>
              <div className="flex flex-wrap gap-3">{YEARS.map((y) => <label key={y} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={years.includes(y)} onChange={(e) => toggle(setYears, y, e.target.checked)} />Year {y}</label>)}</div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Delivery</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="when" className="accent-primary" checked={when === 'now'} onChange={() => setWhen('now')} />Send now</label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground" title="Scheduled sending needs a background scheduler, which is not running in local mode."><input type="radio" name="when" className="accent-primary" checked={when === 'later'} onChange={() => setWhen('later')} />Schedule for later (unavailable locally)</label>
              </div>
              {when === 'later' && (
                <Field label="Send at" htmlFor="aat" error={errors.at} className="max-w-60"><Input id="aat" type="datetime-local" value={at} min={new Date().toISOString().slice(0, 16)} onChange={(e) => setAt(e.target.value)} aria-invalid={!!errors.at || undefined} /></Field>
              )}
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">{when === 'now' ? <><Megaphone /> Send announcement</> : <><CalendarClock /> Schedule</>}</Button>
              <Button type="button" variant="outline" onClick={() => validate(true) && save('Draft')}><Save /> Save as draft</Button>
            </div>
          </form>
        </Panel>

        <Panel title="Recipient preview" className="h-fit lg:sticky lg:top-6">
          <p className="flex items-center gap-2 text-3xl font-semibold tabular-nums"><Users className="size-6 text-primary" aria-hidden="true" />{recipients.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{audience}</p>
          {role !== 'Faculty' && <p className="mt-3 text-xs text-muted-foreground">~{studentCount.toLocaleString('en-IN')} students</p>}
          {role !== 'Students' && <p className="text-xs text-muted-foreground">~{facultyCount} faculty</p>}
        </Panel>
      </div>

      <div className="flex items-end justify-between gap-3">
        <h2 className="font-semibold">Sent announcements</h2>
        <FilterSelect label="Status" value={filter} onChange={setFilter} options={['All', 'Sent', 'Scheduled', 'Draft']} />
      </div>
      <Table
        empty={{ icon: <Megaphone />, title: 'No announcements', description: 'Nothing matches this filter.' }}
        head={['Title', 'Audience', 'Date', 'Status', 'Delivered', 'Opened']}
        rows={history.map((a) => [
          <span key="t" className="flex flex-col"><span className="font-medium">{a.title}</span>{a.link && <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{a.link}</a>}</span>,
          <span key="a" className="text-xs text-muted-foreground">{a.audience}</span>,
          <span key="d" className="whitespace-nowrap tabular-nums">{a.date}</span>,
          <Pill key="s" tone={statusTone[a.status]}>{a.status}</Pill>,
          <span key="dl" className="tabular-nums">{a.delivered !== undefined ? `${a.delivered.toLocaleString('en-IN')} / ${a.recipients.toLocaleString('en-IN')}` : '—'}</span>,
          <span key="o" className="tabular-nums">{a.opened !== undefined && a.delivered ? `${Math.round((a.opened / a.delivered) * 100)}%` : '—'}</span>,
        ])}
      />

      <Confirm
        open={confirming}
        onClose={() => setConfirming(false)}
        title={when === 'now' ? 'Send this announcement?' : 'Schedule this announcement?'}
        description={`${recipients.toLocaleString('en-IN')} recipients · ${audience}`}
        destructive={false}
        onConfirm={() => { void save(when === 'now' ? 'Sent' : 'Scheduled') }}
        confirmDisabled={sending}
        confirmLabel={sending ? 'Sending…' : when === 'now' ? 'Send now' : 'Schedule'}
      >
        <div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="font-medium">{title}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{body}</p></div>
      </Confirm>
    </>
  )
}
