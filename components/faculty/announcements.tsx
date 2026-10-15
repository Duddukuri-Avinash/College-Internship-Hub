'use client'

import { useState, type FormEvent } from 'react'
import { CalendarDays, Megaphone, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Bar, Modal, PageHeader, Panel, selectClass } from '@/components/shared'
import { Field } from '@/components/student/form-bits'
import { useFacultyStore } from '@/components/faculty/faculty-store'
import { EmptyState, Pill, fmtDate } from '@/components/faculty/bits'
import { TODAY, facultyAccount, sectionSizes, sections } from '@/lib/faculty-data'

type AudienceType = 'all' | 'year' | 'section'
type Errors = Partial<Record<'title' | 'body' | 'deadline', string>>

export function FacultyAnnouncements() {
  const { announcements, addAnnouncement } = useFacultyStore()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [year, setYear] = useState('3')
  const [section, setSection] = useState<string>(sections[0])
  const [deadline, setDeadline] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [confirming, setConfirming] = useState(false)

  const recipients =
    audienceType === 'all'
      ? Object.values(sectionSizes).reduce((a, b) => a + b, 0)
      : audienceType === 'year'
        ? sections.filter((s) => s.startsWith(year)).reduce((n, s) => n + sectionSizes[s], 0)
        : sectionSizes[section]
  const audience = audienceType === 'all' ? 'All eligible students' : audienceType === 'year' ? `Year ${year} · All sections` : `Year ${section[0]} · Section ${section.slice(2)}`

  const validate = () => {
    const e: Errors = {}
    if (title.trim().length < 5) e.title = 'Enter a title of at least 5 characters.'
    else if (title.length > 100) e.title = 'Keep the title under 100 characters.'
    if (body.trim().length < 20) e.body = 'Write a message of at least 20 characters.'
    if (deadline && deadline < TODAY) e.deadline = 'The deadline cannot be in the past.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) setConfirming(true)
  }

  const send = () => {
    addAnnouncement({ id: `an${Date.now()}`, title: title.trim(), body: body.trim(), audience, deadline: deadline || undefined, sentOn: TODAY, delivered: recipients, read: 0 })
    toast.success('Announcement sent', { description: `Delivered to ${recipients} students` })
    setConfirming(false)
    setTitle('')
    setBody('')
    setDeadline('')
    setErrors({})
  }

  return (
    <>
      <PageHeader title="Announcements" description="Send updates and deadlines to students in your department." />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 lg:col-span-3">
          <Panel title="Compose announcement">
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="an-title" error={errors.title}>
                <Input id="an-title" value={title} onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: undefined })) }} placeholder="Announcement title" aria-invalid={!!errors.title || undefined} maxLength={120} />
              </Field>
              <Field label="Message" htmlFor="an-body" error={errors.body} hint={`${body.length} characters`}>
                <Textarea id="an-body" rows={5} value={body} onChange={(e) => { setBody(e.target.value); setErrors((x) => ({ ...x, body: undefined })) }} placeholder="Details, venue, what students need to do…" aria-invalid={!!errors.body || undefined} />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Audience</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([['all', 'All eligible'], ['year', 'By year'], ['section', 'By section']] as const).map(([v, l]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                      <input type="radio" name="audience" value={v} checked={audienceType === v} onChange={() => setAudienceType(v)} className="accent-primary" />
                      {l}
                    </label>
                  ))}
                </div>
                {audienceType === 'year' && (
                  <select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} className={`${selectClass} mt-2 sm:w-48`}>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                )}
                {audienceType === 'section' && (
                  <select aria-label="Section" value={section} onChange={(e) => setSection(e.target.value)} className={`${selectClass} mt-2 sm:w-48`}>
                    {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                )}
              </fieldset>
              <Field label="Deadline (optional)" htmlFor="an-deadline" error={errors.deadline} hint="Shown as a due date on the student's announcement.">
                <Input id="an-deadline" type="date" min={TODAY} value={deadline} onChange={(e) => { setDeadline(e.target.value); setErrors((x) => ({ ...x, deadline: undefined })) }} className="sm:w-56" aria-invalid={!!errors.deadline || undefined} />
              </Field>
            </div>
          </Panel>
        </form>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Preview">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Megaphone className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-pretty font-medium">{title.trim() || 'Announcement title'}</p>
                  <p className="text-xs text-muted-foreground">{facultyAccount.name} · {fmtDate(TODAY)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-pretty text-sm text-muted-foreground">{body.trim() || 'Your message will appear here.'}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="primary"><Users className="size-3" aria-hidden="true" /> {audience}</Pill>
                {deadline && <Pill tone="warning"><CalendarDays className="size-3" aria-hidden="true" /> Due {fmtDate(deadline)}</Pill>}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recipients</span>
              <span className="font-semibold tabular-nums" aria-live="polite">{recipients} students</span>
            </div>
            <Button className="mt-4 w-full" onClick={() => validate() && setConfirming(true)}>
              <Send /> Review &amp; send
            </Button>
          </Panel>
        </div>
      </div>

      <Panel title={`Sent announcements (${announcements.length})`}>
        {announcements.length === 0 ? (
          <EmptyState icon={<Megaphone />} title="No announcements sent yet" description="Announcements you send will be listed here with delivery and read counts." />
        ) : (
          <ul className="divide-y">
            {announcements.map((a) => {
              const readPct = a.delivered ? Math.round((a.read / a.delivered) * 100) : 0
              return (
                <li key={a.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Pill>{a.audience}</Pill>
                      <Pill>Sent {fmtDate(a.sentOn)}</Pill>
                      {a.deadline && <Pill tone="warning">Due {fmtDate(a.deadline)}</Pill>}
                    </div>
                  </div>
                  <div className="shrink-0 md:w-52">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Delivered {a.delivered}</span>
                      <span className="tabular-nums">Read {a.read} ({readPct}%)</span>
                    </div>
                    <Bar value={readPct} tone="success" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Send this announcement?"
        description={`${recipients} students (${audience}) will receive an in-app and email notification.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button onClick={send}><Send /> Send now</Button>
          </>
        }
      >
        <p className="font-medium">{title}</p>
        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{body}</p>
        {deadline && <p className="mt-3 text-sm">Deadline: <span className="font-medium">{fmtDate(deadline)}</span></p>}
      </Modal>
    </>
  )
}
