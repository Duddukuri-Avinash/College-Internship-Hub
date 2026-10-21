'use client'

import { useState } from 'react'
import { Check, CheckCheck, Inbox, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Modal, PageHeader, Panel, StatCard, selectClass } from '@/components/shared'
import { useFacultyStore } from '@/components/faculty/faculty-store'
import { EmptyState, Pill, Segmented, fmtDate, initials, type Tone } from '@/components/faculty/bits'
import { TODAY, facultyAccount, type RequestStatus, type RequestType, type StudentRequest } from '@/lib/faculty-data'
import { cn } from '@/lib/utils'

const statuses = ['All', 'New', 'In progress', 'Resolved'] as const
const types: RequestType[] = ['Permission / NOC letter', 'Completion certificate letter', 'Re-verification request', 'Query to faculty']
const statusTone: Record<RequestStatus, Tone> = { New: 'primary', 'In progress': 'warning', Resolved: 'success' }

const approvalText: Record<RequestType, string> = {
  'Permission / NOC letter': 'Your NOC has been approved. The signed letter has been sent to your personal email.',
  'Completion certificate letter': 'Your completion letter has been issued and sent to your personal email.',
  'Re-verification request': 'Re-verification approved. Your submission is back in the verification queue.',
  'Query to faculty': 'Your query has been answered.',
}

export function FacultyRequests() {
  const { requests, updateRequest, replyRequest } = useFacultyStore()
  const [status, setStatus] = useState<(typeof statuses)[number]>('All')
  const [type, setType] = useState<'All' | RequestType>('All')
  const [activeId, setActiveId] = useState<string | undefined>(requests[0]?.id)
  const [reply, setReply] = useState('')
  const [replyError, setReplyError] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const list = requests.filter((r) => (status === 'All' || r.status === status) && (type === 'All' || r.type === type))
  const active = requests.find((r) => r.id === activeId) ?? list[0]
  const count = (s: RequestStatus) => requests.filter((r) => r.status === s).length

  const select = (r: StudentRequest) => {
    setActiveId(r.id)
    setReply('')
    setReplyError('')
  }

  const sendReply = () => {
    if (!active) return
    if (reply.trim().length < 5) return setReplyError('Write a reply of at least 5 characters.')
    replyRequest(active.id, reply.trim())
    setReply('')
    toast.success('Reply sent', { description: active.student })
  }

  const approve = (r: StudentRequest) => {
    updateRequest(r.id, {
      status: 'Resolved',
      decision: 'Approved',
      thread: [...r.thread, { by: facultyAccount.name, text: reply.trim() || approvalText[r.type], date: TODAY, faculty: true }],
    })
    setReply('')
    toast.success('Request approved', { description: `${r.student} has been notified.` })
  }

  const reject = () => {
    if (!active) return
    if (reason.trim().length < 10) return setReasonError('Give a reason of at least 10 characters so the student knows what to fix.')
    updateRequest(active.id, {
      status: 'Resolved',
      decision: 'Rejected',
      reason: reason.trim(),
      thread: [...active.thread, { by: facultyAccount.name, text: reason.trim(), date: TODAY, faculty: true }],
    })
    toast.success('Request rejected', { description: `${active.student} has been notified with your reason.` })
    setRejecting(false)
    setReason('')
  }

  const resolve = (r: StudentRequest) => {
    updateRequest(r.id, { status: 'Resolved' })
    toast.success('Marked as resolved')
  }

  return (
    <>
      <PageHeader title="Student Requests" description="NOC letters, completion letters, re-verification requests and student queries." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="New" value={count('New')} hint="Awaiting your first response" icon={<Inbox className="size-4" />} />
        <StatCard label="In progress" value={count('In progress')} hint="Replied, not yet closed" icon={<Send className="size-4" />} />
        <StatCard label="Resolved" value={count('Resolved')} hint="Approved, rejected or answered" icon={<CheckCheck className="size-4" />} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented options={statuses} value={status} onChange={setStatus} label="Filter by status" />
        <select aria-label="Filter by request type" value={type} onChange={(e) => setType(e.target.value as 'All' | RequestType)} className={cn(selectClass, 'md:w-64')}>
          <option value="All">All request types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Inbox />} title="No requests here" description="Requests that match these filters will appear here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel className="p-2">
            <ul className="flex flex-col gap-1" aria-label="Requests">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    aria-current={active?.id === r.id || undefined}
                    className={cn('flex w-full flex-col gap-1.5 rounded-lg p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50', active?.id === r.id ? 'bg-accent' : 'hover:bg-muted')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.student}</span>
                      <Pill tone={statusTone[r.status]}>{r.status}</Pill>
                    </div>
                    <span className="line-clamp-1 text-sm">{r.subject}</span>
                    <span className="text-xs text-muted-foreground">{r.type} · {fmtDate(r.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {active && (
            <Panel>
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary" aria-hidden="true">{initials(active.student)}</span>
                  <div>
                    <h2 className="font-semibold">{active.subject}</h2>
                    <p className="text-xs text-muted-foreground">{active.student} · {active.regNo} · Section {active.section} · {fmtDate(active.date)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill>{active.type}</Pill>
                  <Pill tone={statusTone[active.status]}>{active.status}</Pill>
                  {active.decision && <Pill tone={active.decision === 'Approved' ? 'success' : 'danger'}>{active.decision}</Pill>}
                </div>
              </div>

              <ol className="flex flex-col gap-3 py-4">
                <li className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{active.student}</p>
                  <p className="mt-1 text-pretty text-sm">{active.message}</p>
                </li>
                {active.thread.map((m, i) => (
                  <li key={i} className={cn('rounded-lg p-3', m.faculty ? 'ml-6 border border-primary/15 bg-accent/60' : 'mr-6 bg-muted/50')}>
                    <p className="text-xs font-medium text-muted-foreground">{m.by} · {fmtDate(m.date)}</p>
                    <p className="mt-1 text-pretty text-sm">{m.text}</p>
                  </li>
                ))}
              </ol>

              {active.status === 'Resolved' ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">This request is resolved{active.decision ? ` (${active.decision.toLowerCase()})` : ''}.</p>
              ) : (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reply">Reply to {active.student}</Label>
                    <Textarea id="reply" rows={3} value={reply} onChange={(e) => { setReply(e.target.value); setReplyError('') }} placeholder="Write a reply…" aria-invalid={!!replyError || undefined} />
                    {replyError && <p className="text-xs text-destructive" role="alert">{replyError}</p>}
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Button variant="outline" onClick={sendReply}><Send /> Send reply</Button>
                    <div className="flex flex-wrap gap-2">
                      {active.type === 'Query to faculty' ? (
                        <Button onClick={() => resolve(active)}><CheckCheck /> Mark resolved</Button>
                      ) : (
                        <>
                          <Button variant="ghost" onClick={() => resolve(active)}>Mark resolved</Button>
                          <Button variant="destructive" onClick={() => { setRejecting(true); setReason(''); setReasonError('') }}><X /> Reject</Button>
                          <Button onClick={() => approve(active)}><Check /> Approve</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      )}

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject this request?"
        description={active ? `${active.student} · ${active.type}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject request</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-reason">Reason for rejection</Label>
          <Textarea id="reject-reason" rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError('') }} placeholder="e.g. The internship dates overlap with mid-semester exams." aria-invalid={!!reasonError || undefined} />
          {reasonError ? <p className="text-xs text-destructive" role="alert">{reasonError}</p> : <p className="text-xs text-muted-foreground">The student will see this reason.</p>}
        </div>
      </Modal>
    </>
  )
}
