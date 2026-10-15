'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Clock, MessageSquareWarning, UserCheck, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal, StatCard, selectClass } from '@/components/shared'
import { Pill, fmtDate, type Tone } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { ReasonModal, Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { COLLEGE_DOMAIN, FACULTY_ROLES, type ApprovalStatus, type FacultyApproval, type FacultyRole } from '@/lib/admin-data'

const tone: Record<ApprovalStatus, Tone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger', 'Correction requested': 'orange' }
const TABS = ['Pending', 'Approved', 'Rejected', 'All'] as const
type Tab = (typeof TABS)[number]

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Pill tone={tone[status]}>{status}</Pill>
}

export function Approvals() {
  const { approvals, setApprovals, setFaculty, log } = useAdmin()
  const [tab, setTab] = useState<Tab>('Pending')
  const [approving, setApproving] = useState<FacultyApproval | null>(null)
  const [role, setRole] = useState<FacultyRole>('Faculty Mentor')
  const [rejecting, setRejecting] = useState<FacultyApproval | null>(null)
  const [correcting, setCorrecting] = useState<FacultyApproval | null>(null)

  const isPending = (a: FacultyApproval) => a.status === 'Pending' || a.status === 'Correction requested'
  const count = (s: ApprovalStatus) => approvals.filter((a) => a.status === s).length
  const counts: Record<Tab, number> = {
    Pending: approvals.filter(isPending).length,
    Approved: count('Approved'),
    Rejected: count('Rejected'),
    All: approvals.length,
  }
  const rows = approvals.filter((a) => (tab === 'All' ? true : tab === 'Pending' ? isPending(a) : a.status === tab))

  function update(id: string, status: ApprovalStatus, note?: string) {
    setApprovals((list) => list.map((a) => (a.id === id ? { ...a, status, note } : a)))
  }

  function confirmApprove() {
    if (!approving) return
    const a = approving
    update(a.id, 'Approved')
    setFaculty((f) => [
      ...f,
      { id: `f${Date.now()}`, name: a.name, empId: a.empId, dept: a.dept, designation: a.designation, email: a.email, roles: [role], groups: [], status: 'Active', verified: 0, turnaround: 0, pending: { verifications: 0, requests: 0, reviews: 0 } },
    ])
    log('Approved faculty registration', 'User management', `${a.name} · ${a.empId}`, { status: a.status }, { status: 'Approved', role })
    toast.success(`${a.name} approved and added to Faculty`)
    setApproving(null)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending" value={count('Pending')} hint="Awaiting a decision" icon={<Clock className="size-4" />} />
        <StatCard label="Correction requested" value={count('Correction requested')} hint="Waiting on faculty" icon={<MessageSquareWarning className="size-4" />} />
        <StatCard label="Approved" value={count('Approved')} hint="Added to Faculty" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Rejected" value={count('Rejected')} hint="With a recorded reason" icon={<XCircle className="size-4" />} />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter registrations" counts={counts} />

      <Table
        empty={{ icon: <UserCheck />, title: 'No registrations here', description: tab === 'Pending' ? 'All faculty registrations have been reviewed.' : 'Nothing matches this filter yet.' }}
        head={['Faculty', 'Employee ID', 'Department', 'Designation', 'College email', 'Submitted', 'Status', <span key="a" className="sr-only">Actions</span>]}
        rows={rows.map((a) => [
          <span key="n" className="font-medium">{a.name}</span>,
          <span key="e" className="font-mono text-xs">{a.empId}</span>,
          a.dept,
          a.designation,
          <span key="m" className="flex flex-col">
            <span>{a.email}</span>
            {!a.email.endsWith(COLLEGE_DOMAIN) && <span className="text-xs text-destructive">Not a college domain</span>}
          </span>,
          <span key="d" className="whitespace-nowrap tabular-nums text-muted-foreground">{fmtDate(a.date)}</span>,
          <span key="s" className="flex flex-col gap-1">
            <ApprovalBadge status={a.status} />
            {a.note && <span className="max-w-48 text-xs text-muted-foreground">{a.note}</span>}
          </span>,
          isPending(a) ? (
            <div key="x" className="flex justify-end gap-2">
              <Button size="sm" onClick={() => { setRole('Faculty Mentor'); setApproving(a) }}><Check /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setCorrecting(a)}>Request correction</Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejecting(a)}><X /> Reject</Button>
            </div>
          ) : (
            <span key="x" className="block text-right text-xs text-muted-foreground">Reviewed</span>
          ),
        ])}
      />

      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        title={`Approve ${approving?.name ?? ''}`}
        description="They will be able to sign in and will appear in Manage Faculty."
        footer={<><Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button><Button onClick={confirmApprove}>Approve faculty</Button></>}
      >
        <Field label="Initial role" htmlFor="ap-role" hint="You can change roles and section assignments later.">
          <select id="ap-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as FacultyRole)}>
            {FACULTY_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </Modal>

      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.name ?? ''}`}
        description="The applicant receives this reason by email."
        label="Reason for rejection"
        confirmLabel="Reject registration"
        destructive
        onConfirm={(reason) => {
          if (!rejecting) return
          update(rejecting.id, 'Rejected', reason)
          log('Rejected faculty registration', 'User management', `${rejecting.name} · ${rejecting.empId}`, { status: rejecting.status }, { status: 'Rejected', reason })
          toast.success('Registration rejected')
          setRejecting(null)
        }}
      />
      <ReasonModal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        title={`Request correction from ${correcting?.name ?? ''}`}
        description="Explain what needs to be fixed. The registration stays in the queue."
        label="What should they correct?"
        confirmLabel="Send request"
        onConfirm={(reason) => {
          if (!correcting) return
          update(correcting.id, 'Correction requested', reason)
          log('Requested registration correction', 'User management', `${correcting.name} · ${correcting.empId}`, undefined, { note: reason })
          toast.success('Correction request sent')
          setCorrecting(null)
        }}
      />
    </>
  )
}
