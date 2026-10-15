'use client'

import { useState } from 'react'
import { Briefcase, CalendarClock, Copy, Eye, Lock, Pencil, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, PageHeader, Panel } from '@/components/shared'
import type { View } from '@/components/app-shell'
import { useFacultyStore } from '@/components/faculty/faculty-store'
import { EmptyState, Pill, Segmented, daysUntil, fmtDate, td, th, type Tone } from '@/components/faculty/bits'
import type { OppStatus, Opportunity } from '@/lib/faculty-data'

const tabs = ['All', 'Active', 'Draft', 'Closed'] as const
const statusTone: Record<OppStatus, Tone> = { Active: 'success', Draft: 'neutral', Closed: 'danger' }

export function ManageOpportunities({ navigate }: { navigate: (v: View) => void }) {
  const { opportunities, updateOpportunity, duplicateOpportunity, students } = useFacultyStore()
  const [tab, setTab] = useState<(typeof tabs)[number]>('All')
  const [query, setQuery] = useState('')
  const [extending, setExtending] = useState<Opportunity | null>(null)
  const [newDeadline, setNewDeadline] = useState('')
  const [deadlineError, setDeadlineError] = useState('')
  const [closing, setClosing] = useState<Opportunity | null>(null)
  const [viewing, setViewing] = useState<Opportunity | null>(null)

  const q = query.trim().toLowerCase()
  const list = opportunities.filter((o) => (tab === 'All' || o.status === tab) && (!q || `${o.company} ${o.role}`.toLowerCase().includes(q)))
  const counts = {
    All: opportunities.length,
    Active: opportunities.filter((o) => o.status === 'Active').length,
    Draft: opportunities.filter((o) => o.status === 'Draft').length,
    Closed: opportunities.filter((o) => o.status === 'Closed').length,
  }

  const openExtend = (o: Opportunity) => {
    setExtending(o)
    setNewDeadline('')
    setDeadlineError('')
  }

  const confirmExtend = () => {
    if (!extending) return
    if (!newDeadline) return setDeadlineError('Choose a new deadline.')
    if (newDeadline <= extending.deadline || daysUntil(newDeadline) < 1) return setDeadlineError('The new deadline must be later than the current one and in the future.')
    updateOpportunity(extending.id, { deadline: newDeadline, status: extending.status === 'Closed' ? 'Active' : extending.status })
    toast.success('Deadline extended', { description: `${extending.company} · now closes ${fmtDate(newDeadline)}` })
    setExtending(null)
  }

  const interested = viewing ? students.filter((s) => viewing.interested.includes(s.id)) : []

  return (
    <>
      <PageHeader
        title="Manage Opportunities"
        description="Track, edit and close the internships you have posted for your department."
        actions={
          <Button onClick={() => navigate({ name: 'post-opportunity' })}>
            <Plus /> Post opportunity
          </Button>
        }
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Segmented options={tabs} value={tab} onChange={setTab} label="Filter by status" counts={counts} />
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or role" aria-label="Search opportunities" className="h-9 pl-8" />
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<Briefcase />}
            title={opportunities.length ? 'No opportunities match' : 'No opportunities posted yet'}
            description={opportunities.length ? 'Try another status or search term.' : 'Post your first college opportunity to notify eligible students.'}
            action={!opportunities.length && <Button onClick={() => navigate({ name: 'post-opportunity' })}>Post opportunity</Button>}
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-y bg-muted/40">
                <tr>
                  <th className={`${th} pl-5`}>Company &amp; role</th>
                  <th className={th}>Deadline</th>
                  <th className={`${th} text-right`}>Eligible</th>
                  <th className={`${th} text-right`}>Interested</th>
                  <th className={th}>Status</th>
                  <th className={`${th} pr-5 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((o) => {
                  const left = daysUntil(o.deadline)
                  return (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className={`${td} pl-5`}>
                        <p className="font-medium">{o.company}</p>
                        <p className="text-xs text-muted-foreground">{o.role} · {o.mode} · {o.duration}</p>
                      </td>
                      <td className={td}>
                        <p className="tabular-nums">{fmtDate(o.deadline)}</p>
                        <p className={`text-xs ${o.status === 'Active' && left <= 3 && left >= 0 ? 'font-medium text-warning-foreground' : 'text-muted-foreground'}`}>
                          {left < 0 ? 'Deadline passed' : left === 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`}
                        </p>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{o.eligible}</td>
                      <td className={`${td} text-right tabular-nums`}>{o.interested.length}</td>
                      <td className={td}><Pill tone={statusTone[o.status]}>{o.status}</Pill></td>
                      <td className={`${td} pr-5`}>
                        <div className="flex justify-end gap-0.5">
                          <Button size="icon" variant="ghost" aria-label={`Edit ${o.role} at ${o.company}`} title="Edit" onClick={() => navigate({ name: 'post-opportunity', editId: o.id })}><Pencil /></Button>
                          <Button size="icon" variant="ghost" aria-label={`Extend deadline for ${o.company}`} title="Extend deadline" onClick={() => openExtend(o)}><CalendarClock /></Button>
                          <Button size="icon" variant="ghost" aria-label={`Duplicate ${o.company} opportunity`} title="Duplicate" onClick={() => {
                            const copy = duplicateOpportunity(o.id)
                            if (copy) toast.success('Opportunity duplicated as draft', { action: { label: 'Edit', onClick: () => navigate({ name: 'post-opportunity', editId: copy.id }) } })
                          }}><Copy /></Button>
                          <Button size="icon" variant="ghost" aria-label={`View interested students for ${o.company}`} title="View interested students" onClick={() => setViewing(o)}><Eye /></Button>
                          <Button size="icon" variant="ghost" aria-label={`Close ${o.company} opportunity`} title="Close" disabled={o.status === 'Closed'} onClick={() => setClosing(o)} className="text-destructive hover:text-destructive"><Lock /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={!!extending}
        onClose={() => setExtending(null)}
        title="Extend deadline"
        description={extending ? `${extending.company} · ${extending.role} · currently ${fmtDate(extending.deadline)}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setExtending(null)}>Cancel</Button>
            <Button onClick={confirmExtend}>Extend deadline</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-deadline">New deadline</Label>
          <Input id="new-deadline" type="date" value={newDeadline} min={extending?.deadline} onChange={(e) => { setNewDeadline(e.target.value); setDeadlineError('') }} aria-invalid={!!deadlineError || undefined} />
          {deadlineError ? <p className="text-xs text-destructive" role="alert">{deadlineError}</p> : <p className="text-xs text-muted-foreground">Interested students are notified of the new date.{extending?.status === 'Closed' && ' The listing will be reopened.'}</p>}
        </div>
      </Modal>

      <Modal
        open={!!closing}
        onClose={() => setClosing(null)}
        title="Close this opportunity?"
        description={closing ? `${closing.company} · ${closing.role}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setClosing(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (closing) { updateOpportunity(closing.id, { status: 'Closed' }); toast.success('Opportunity closed', { description: closing.company }) } setClosing(null) }}>Close opportunity</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Students will no longer be able to view or apply to this listing. You can reopen it later by extending the deadline.</p>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Interested students" description={viewing ? `${viewing.company} · ${viewing.role} · ${interested.length} of ${viewing.eligible} eligible` : undefined}>
        {interested.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No students have shown interest yet.</p>
        ) : (
          <ul className="divide-y">
            {interested.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.regNo} · Year {s.year} · Section {s.section} · CGPA {s.cgpa}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setViewing(null); navigate({ name: 'faculty-student', id: s.id }) }}>View profile</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
