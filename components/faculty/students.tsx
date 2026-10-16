'use client'

import { useState } from 'react'
import { ArrowLeft, BellRing, Briefcase, FileText, GraduationCap, Mail, Phone, Search, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { AppStatusBadge, Bar, Chip, Modal, PageHeader, Panel, VerifyBadge, selectClass } from '@/components/shared'
import type { View } from '@/components/app-shell'
import { useFacultyStore } from '@/components/faculty/faculty-store'
import { EmptyState, Pill, fmtDate, initials, td, th, type Tone } from '@/components/faculty/bits'
import type { DeptStudent, InternshipStatus, StudentVerification } from '@/lib/faculty-data'

const internshipTone: Record<InternshipStatus, Tone> = { 'Not started': 'neutral', Applied: 'primary', Ongoing: 'warning', Completed: 'success' }
const withoutInternship = (s: DeptStudent) => s.status === 'Not started' || s.status === 'Applied'

function VerificationCell({ status }: { status: StudentVerification }) {
  return status === 'No submissions' ? <Pill>No submissions</Pill> : <VerifyBadge status={status} />
}

export function FacultyStudents({ navigate, quick }: { navigate: (v: View) => void; quick?: 'without' }) {
  const { students, reminders, remind } = useFacultyStore()
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [section, setSection] = useState('all')
  const [status, setStatus] = useState('all')
  const [verification, setVerification] = useState('all')
  const [onlyWithout, setOnlyWithout] = useState(quick === 'without')
  const [selected, setSelected] = useState<string[]>([])
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)

  const q = query.trim().toLowerCase()
  const list = students.filter(
    (s) =>
      (!q || `${s.name} ${s.regNo}`.toLowerCase().includes(q)) &&
      (year === 'all' || String(s.year) === year) &&
      (section === 'all' || s.section === section) &&
      (status === 'all' || s.status === status) &&
      (verification === 'all' || s.verification === verification) &&
      (!onlyWithout || withoutInternship(s)),
  )
  const withoutCount = students.filter(withoutInternship).length
  const remindable = list.filter(withoutInternship).map((s) => s.id)
  const allSelected = remindable.length > 0 && remindable.every((id) => selected.includes(id))
  const hasFilters = q || year !== 'all' || section !== 'all' || status !== 'all' || verification !== 'all'

  const clear = () => {
    setQuery('')
    setYear('all')
    setSection('all')
    setStatus('all')
    setVerification('all')
  }

  const sendReminder = () => {
    if (!confirmIds) return
    remind(confirmIds)
    toast.success(`Reminder sent to ${confirmIds.length} student${confirmIds.length === 1 ? '' : 's'}`, { description: 'Delivered by in-app notification and college email.' })
    setSelected((sel) => sel.filter((id) => !confirmIds.includes(id)))
    setConfirmIds(null)
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Search students and track their internship progress."
        actions={
          <Button variant={onlyWithout ? 'default' : 'outline'} onClick={() => { setOnlyWithout((v) => !v); setSelected([]) }} aria-pressed={onlyWithout}>
            <UserX /> Students without internships
            <span className="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{withoutCount}</span>
          </Button>
        }
      />

      <Panel>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or reg. no." aria-label="Search students" className="h-9 pl-8" />
          </div>
          <select aria-label="Filter by year" value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
            <option value="all">All years</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          <select aria-label="Filter by section" value={section} onChange={(e) => setSection(e.target.value)} className={selectClass}>
            <option value="all">All sections</option>
            {['A', 'B', 'C'].map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>
          <select aria-label="Filter by internship status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="all">Any internship status</option>
            {(['Not started', 'Applied', 'Ongoing', 'Completed'] as const).map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filter by verification status" value={verification} onChange={(e) => setVerification(e.target.value)} className={selectClass}>
            <option value="all">Any verification</option>
            {(['Verified', 'Pending', 'Additional Proof Required', 'Rejected', 'No submissions'] as const).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {onlyWithout && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-medium">{remindable.length} students</span> have not started or secured an internship yet.
            </p>
            <Button size="sm" disabled={!remindable.length} onClick={() => setConfirmIds(selected.length ? selected : remindable)}>
              <BellRing /> {selected.length ? `Send reminder to ${selected.length} selected` : 'Send reminder to all'}
            </Button>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span aria-live="polite">Showing {list.length} of {students.length} students</span>
          {hasFilters && <button type="button" onClick={clear} className="font-medium text-primary hover:underline">Clear filters</button>}
        </div>

        {list.length === 0 ? (
          <EmptyState icon={<GraduationCap />} title="No students match these filters" description="Adjust the filters or clear them to see all students." action={<Button variant="outline" onClick={() => { clear(); setOnlyWithout(false) }}>Clear filters</Button>} />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-y bg-muted/40">
                <tr>
                  {onlyWithout && (
                    <th className={`${th} w-10 pl-5`}>
                      <Checkbox aria-label="Select all students" checked={allSelected} onCheckedChange={() => setSelected(allSelected ? [] : remindable)} />
                    </th>
                  )}
                  <th className={`${th} ${onlyWithout ? '' : 'pl-5'}`}>Student</th>
                  <th className={th}>Year · Sec</th>
                  <th className={`${th} text-right`}>CGPA</th>
                  <th className={th}>Resume readiness</th>
                  <th className={th}>Internship</th>
                  <th className={th}>Verification</th>
                  <th className={`${th} pr-5 text-right`}>{onlyWithout ? 'Reminder' : ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate({ name: 'faculty-student', id: s.id })}>
                    {onlyWithout && (
                      <td className={`${td} pl-5`} onClick={(e) => e.stopPropagation()}>
                        <Checkbox aria-label={`Select ${s.name}`} checked={selected.includes(s.id)} onCheckedChange={() => setSelected((sel) => (sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id]))} />
                      </td>
                    )}
                    <td className={`${td} ${onlyWithout ? '' : 'pl-5'}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary" aria-hidden="true">{initials(s.name)}</span>
                        <div className="min-w-0">
                          <button type="button" className="truncate text-left font-medium outline-none hover:text-primary focus-visible:underline" onClick={(e) => { e.stopPropagation(); navigate({ name: 'faculty-student', id: s.id }) }}>{s.name}</button>
                          <p className="text-xs text-muted-foreground">{s.regNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} tabular-nums`}>{s.year}-{s.section}</td>
                    <td className={`${td} text-right tabular-nums`}>{s.cgpa.toFixed(1)}</td>
                    <td className={td}>
                      <div className="flex w-32 items-center gap-2">
                        <Bar value={s.readiness} tone={s.readiness >= 75 ? 'success' : s.readiness >= 55 ? 'primary' : 'warning'} />
                        <span className="w-8 text-xs tabular-nums">{s.readiness}%</span>
                      </div>
                    </td>
                    <td className={td}><Pill tone={internshipTone[s.status]}>{s.status}</Pill></td>
                    <td className={td}><VerificationCell status={s.verification} /></td>
                    <td className={`${td} pr-5 text-right`} onClick={(e) => e.stopPropagation()}>
                      {onlyWithout &&
                        (reminders[s.id] ? (
                          <span className="text-xs text-muted-foreground">Reminded {fmtDate(reminders[s.id])}</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setConfirmIds([s.id])}>Remind</Button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={!!confirmIds}
        onClose={() => setConfirmIds(null)}
        title="Send internship reminder?"
        description={confirmIds ? `${confirmIds.length} student${confirmIds.length === 1 ? '' : 's'} will be notified.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmIds(null)}>Cancel</Button>
            <Button onClick={sendReminder}><BellRing /> Send reminder</Button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Reminder: secure your internship</p>
          <p className="mt-1 text-muted-foreground">You have not recorded an internship yet. Browse college opportunities on InternHub, or submit a self-found internship for verification before the semester deadline.</p>
        </div>
      </Modal>
    </>
  )
}

export function FacultyStudentDetail({ id, navigate }: { id: string; navigate: (v: View) => void }) {
  const { students, reminders, remind } = useFacultyStore()
  const s = students.find((x) => x.id === id)
  const back = <Button variant="outline" onClick={() => navigate({ name: 'faculty-students' })}><ArrowLeft /> All students</Button>

  if (!s) {
    return (
      <>
        <PageHeader title="Student not found" actions={back} />
        <EmptyState icon={<GraduationCap />} title="This student is not in your department" description="They may have been moved to another department." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={s.name}
        description={`${s.regNo} · Year ${s.year} · Section ${s.section} · ${s.branch}`}
        actions={
          <>
            {back}
            {withoutInternship(s) && (
              <Button disabled={!!reminders[s.id]} onClick={() => { remind([s.id]); toast.success('Reminder sent', { description: s.name }) }}>
                <BellRing /> {reminders[s.id] ? 'Reminder sent' : 'Send reminder'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Panel title="Profile">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent font-semibold text-primary" aria-hidden="true">{initials(s.name)}</span>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone={internshipTone[s.status]}>{s.status}</Pill>
                <VerificationCell status={s.verification} />
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" aria-hidden="true" /><dt className="sr-only">Email</dt><dd className="truncate">{s.email}</dd></div>
              <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" aria-hidden="true" /><dt className="sr-only">Phone</dt><dd className="tabular-nums">{s.phone}</dd></div>
              <div className="flex items-center justify-between border-t pt-2.5"><dt className="text-muted-foreground">CGPA</dt><dd className="font-medium tabular-nums">{s.cgpa.toFixed(2)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Resume readiness">
            <p className="text-3xl font-semibold tabular-nums">{s.readiness}<span className="text-base text-muted-foreground">/100</span></p>
            <Bar value={s.readiness} className="mt-3" tone={s.readiness >= 75 ? 'success' : s.readiness >= 55 ? 'primary' : 'warning'} />
            <p className="mt-2 text-xs text-muted-foreground">Read-only. Calculated from the student&apos;s latest resume analysis.</p>
          </Panel>

          <Panel title="Skills">
            <div className="flex flex-wrap gap-1.5">{s.skills.map((k) => <Chip key={k}>{k}</Chip>)}</div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title={`Applications (${s.applications.length})`}>
            {s.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              <ul className="divide-y">
                {s.applications.map((a) => (
                  <li key={`${a.company}-${a.role}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.role}</p>
                      <p className="text-xs text-muted-foreground">{a.company} · {fmtDate(a.date)}</p>
                    </div>
                    <AppStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Internships">
              {s.internships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No internships recorded.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {s.internships.map((i) => (
                    <li key={i.company} className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Briefcase className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{i.role}</p>
                        <p className="text-xs text-muted-foreground">{i.company} · {i.period}</p>
                        <Pill tone={i.status === 'Completed' ? 'success' : 'warning'} className="mt-1">{i.status}</Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Documents">
              {s.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents submitted.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {s.documents.map((d) => (
                    <li key={d.name} className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.type} · {fmtDate(d.date)}</p>
                      </div>
                      <VerifyBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Verification history">
            {s.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No verification activity yet.</p>
            ) : (
              <ol className="relative ml-2 flex flex-col gap-4 border-l pl-5">
                {s.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-card ${t.status === 'Verified' ? 'bg-success' : t.status === 'Rejected' ? 'bg-destructive' : t.status ? 'bg-orange-500' : 'bg-primary'}`} aria-hidden="true" />
                    <p className="text-sm font-medium">{t.event}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(t.date)} · {t.by}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
