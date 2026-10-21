'use client'

import { useState } from 'react'
import { AlertTriangle, Pencil, Plus, Shuffle, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bar, Modal, Panel, selectClass } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Confirm, SearchBox, Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { BRANCHES, FACULTY_ROLES, type AdminFaculty, type FacultyRole } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'

const TABS = ['Directory', 'Workload'] as const
const total = (f: AdminFaculty) => f.pending.verifications + f.pending.requests + f.pending.reviews

export function FacultyManagement() {
  const { faculty, setFaculty, log } = useAdmin()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Directory')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AdminFaculty | 'new' | null>(null)
  const [deactivating, setDeactivating] = useState<AdminFaculty | null>(null)
  const [reassigning, setReassigning] = useState<AdminFaculty | null>(null)

  const list = faculty.filter((f) => !q.trim() || `${f.name} ${f.empId} ${f.dept}`.toLowerCase().includes(q.trim().toLowerCase()))

  function reactivate(f: AdminFaculty) {
    setFaculty((l) => l.map((x) => (x.id === f.id ? { ...x, status: 'Active' } : x)))
    log('Reactivated faculty', 'User management', f.empId, { status: 'Inactive' }, { status: 'Active' })
    toast.success(`${f.name} reactivated`)
  }

  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Faculty views" counts={{ Workload: faculty.filter((f) => f.status === 'Inactive' && total(f) > 0).length || undefined }} />
      {tab === 'Directory' ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={q} onChange={setQ} placeholder="Search by name, ID or department" label="Search faculty" />
            <Button onClick={() => setEditing('new')}><Plus /> Add faculty</Button>
          </div>
          <Table
            empty={{ icon: <UserPlus />, title: 'No faculty found', description: 'Try a different search.' }}
            head={['Name', 'Department', 'Roles', 'Assigned groups', 'Verified this month', 'Avg. turnaround', 'Status', <span key="a" className="sr-only">Actions</span>]}
            rows={list.map((f) => [
              <span key="n" className="flex flex-col"><span className="font-medium">{f.name}</span><span className="text-xs text-muted-foreground">{f.designation} · {f.empId}</span></span>,
              f.dept,
              <div key="r" className="flex flex-wrap gap-1">{f.roles.map((r) => <Pill key={r} tone="primary">{r}</Pill>)}</div>,
              <span key="g" className="text-xs text-muted-foreground">{f.groups.length ? f.groups.join(', ') : 'None assigned'}</span>,
              <span key="v" className="tabular-nums">{f.verified}</span>,
              <span key="t" className="tabular-nums">{f.turnaround ? `${f.turnaround} days` : '—'}</span>,
              <Pill key="s" tone={f.status === 'Active' ? 'success' : 'neutral'}>{f.status}</Pill>,
              <div key="x" className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" aria-label={`Edit ${f.name}`} onClick={() => setEditing(f)}><Pencil /></Button>
                {f.status === 'Active' ? (
                  <Button size="icon" variant="ghost" aria-label={`Deactivate ${f.name}`} className="text-destructive hover:text-destructive" onClick={() => setDeactivating(f)}><UserMinus /></Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => reactivate(f)}>Reactivate</Button>
                )}
              </div>,
            ])}
          />
        </>
      ) : (
        <Workload onReassign={setReassigning} />
      )}

      <FacultyForm key={editing === 'new' ? 'new' : editing?.id ?? 'none'} open={!!editing} member={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />

      <Confirm
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title={`Deactivate ${deactivating?.name}?`}
        description="They will lose access immediately. Their verification history is kept."
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (!deactivating) return
          const f = deactivating
          setFaculty((l) => l.map((x) => (x.id === f.id ? { ...x, status: 'Inactive' } : x)))
          log('Deactivated faculty', 'User management', f.empId, { status: 'Active' }, { status: 'Inactive' })
          setDeactivating(null)
          if (total(f) > 0) {
            toast.warning(`${f.name} has ${total(f)} pending items`, { action: { label: 'Reassign', onClick: () => setReassigning({ ...f, status: 'Inactive' }) } })
            setReassigning({ ...f, status: 'Inactive' })
          } else toast.success(`${f.name} deactivated`)
        }}
      >
        {deactivating && total(deactivating) > 0 && (
          <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
            {total(deactivating)} pending items will need to be reassigned. You will be asked who should take them next.
          </p>
        )}
      </Confirm>

      <ReassignModal member={reassigning} onClose={() => setReassigning(null)} />
    </>
  )
}

function Workload({ onReassign }: { onReassign: (f: AdminFaculty) => void }) {
  const { faculty } = useAdmin()
  const max = Math.max(1, ...faculty.map(total))
  const sorted = [...faculty].sort((a, b) => total(b) - total(a))
  return (
    <Panel title="Pending items per faculty">
      <ul className="flex flex-col gap-4">
        {sorted.map((f) => (
          <li key={f.id} className="grid gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">{f.name}{f.status === 'Inactive' && <Pill>Inactive</Pill>}</p>
              <p className="text-xs text-muted-foreground">{f.pending.verifications} verifications · {f.pending.requests} requests · {f.pending.reviews} reviews</p>
            </div>
            <div className="flex items-center gap-3">
              <Bar value={(total(f) / max) * 100} tone={f.status === 'Inactive' && total(f) ? 'warning' : total(f) >= 10 ? 'warning' : 'primary'} />
              <span className="w-8 text-right text-sm tabular-nums">{total(f)}</span>
            </div>
            <div className="sm:w-36 sm:text-right">
              {total(f) > 0 && (f.status === 'Inactive' ? (
                <Button size="sm" onClick={() => onReassign(f)}><Shuffle /> Reassign pending</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onReassign(f)}>Reassign</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ReassignModal({ member, onClose }: { member: AdminFaculty | null; onClose: () => void }) {
  const { faculty, setFaculty, log } = useAdmin()
  const targets = faculty.filter((f) => f.status === 'Active' && f.id !== member?.id)
  const suggested = [...targets].sort((a, b) => (a.dept === member?.dept ? -1 : 0) - (b.dept === member?.dept ? -1 : 0) || total(a) - total(b))[0]
  const [to, setTo] = useState('')
  const target = to || suggested?.id || ''

  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title={`Reassign ${member ? total(member) : 0} pending items`}
      description={member ? `From ${member.name} (${member.dept})` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Later</Button>
          <Button
            disabled={!target}
            onClick={() => {
              if (!member) return
              const t = faculty.find((f) => f.id === target)!
              setFaculty((l) => l.map((f) => {
                if (f.id === member.id) return { ...f, pending: { verifications: 0, requests: 0, reviews: 0 } }
                if (f.id === t.id) return { ...f, pending: { verifications: f.pending.verifications + member.pending.verifications, requests: f.pending.requests + member.pending.requests, reviews: f.pending.reviews + member.pending.reviews } }
                return f
              }))
              log('Reassigned pending items', 'User management', `${member.name} → ${t.name}`, { owner: member.name, items: String(total(member)) }, { owner: t.name })
              toast.success(`${total(member)} items reassigned to ${t.name}`)
              setTo('')
              onClose()
            }}
          >
            Reassign items
          </Button>
        </>
      }
    >
      <Field label="Assign to" htmlFor="ra-to" hint="Suggested: same department with the lightest queue.">
        <select id="ra-to" className={selectClass} value={target} onChange={(e) => setTo(e.target.value)}>
          {targets.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.dept} · {total(f)} pending</option>)}
        </select>
      </Field>
    </Modal>
  )
}

function FacultyForm({ open, member, onClose }: { open: boolean; member: AdminFaculty | null; onClose: () => void }) {
  const { faculty, setFaculty, sections, log } = useAdmin()
  const [f, setF] = useState({ name: member?.name ?? '', empId: member?.empId ?? '', dept: member?.dept ?? 'CSE', designation: member?.designation ?? 'Assistant Professor', email: member?.email ?? '' })
  const [roles, setRoles] = useState<FacultyRole[]>(member?.roles ?? ['Faculty Mentor'])
  const [groups, setGroups] = useState<string[]>(member?.groups ?? [])
  const [groupBranch, setGroupBranch] = useState(member?.dept ?? 'CSE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const options = sections.filter((s) => s.branch === groupBranch && !s.archived).map((s) => `${s.branch} · Year ${s.year} · ${s.name}`)

  function save() {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Enter the full name.'
    if (!/^RVR\d{4}$/.test(f.empId.trim().toUpperCase())) e.empId = 'Format: RVR1234.'
    else if (faculty.some((x) => x.empId === f.empId.trim().toUpperCase() && x.id !== member?.id)) e.empId = 'Employee ID already exists.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid personal email address.'
    if (!roles.length) e.roles = 'Assign at least one role.'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { ...f, name: f.name.trim(), empId: f.empId.trim().toUpperCase(), email: f.email.trim().toLowerCase(), roles, groups }
    if (member) {
      setFaculty((l) => l.map((x) => (x.id === member.id ? { ...x, ...data } : x)))
      log('Edited faculty', 'User management', data.empId, { roles: member.roles.join(', '), groups: member.groups.join(', ') || 'None' }, { roles: roles.join(', '), groups: groups.join(', ') || 'None' })
      toast.success('Faculty updated')
    } else {
      setFaculty((l) => [...l, { id: `f${Date.now()}`, ...data, status: 'Active', verified: 0, turnaround: 0, pending: { verifications: 0, requests: 0, reviews: 0 } }])
      log('Added faculty', 'User management', `${data.name} · ${data.empId}`)
      toast.success(`${data.name} added`)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={member ? `Edit ${member.name}` : 'Add faculty'} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{member ? 'Save changes' : 'Add faculty'}</Button></>}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="ff-name" error={errors.name}><Input id="ff-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errors.name || undefined} /></Field>
          <Field label="Employee ID" htmlFor="ff-emp" error={errors.empId}><Input id="ff-emp" value={f.empId} placeholder="RVR1234" onChange={(e) => setF({ ...f, empId: e.target.value })} aria-invalid={!!errors.empId || undefined} /></Field>
          <Field label="Department" htmlFor="ff-dept"><select id="ff-dept" className={selectClass} value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}>{BRANCHES.map((b) => <option key={b} value={b}>{branchName(b)}</option>)}</select></Field>
          <Field label="Designation" htmlFor="ff-des"><select id="ff-des" className={selectClass} value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })}>{['Assistant Professor', 'Associate Professor', 'Professor', 'Head of Department'].map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Personal email" htmlFor="ff-email" error={errors.email} className="sm:col-span-2"><Input id="ff-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" aria-invalid={!!errors.email || undefined} /></Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Roles</legend>
          <div className="flex flex-wrap gap-4">
            {FACULTY_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" checked={roles.includes(r)} onChange={(e) => setRoles((l) => (e.target.checked ? [...l, r] : l.filter((x) => x !== r)))} />{r}
              </label>
            ))}
          </div>
          {errors.roles && <p className="mt-1 text-xs text-destructive" role="alert">{errors.roles}</p>}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Assigned sections / year groups</legend>
          <select aria-label="Branch for groups" className={`${selectClass} max-w-40`} value={groupBranch} onChange={(e) => setGroupBranch(e.target.value)}>{BRANCHES.map((b) => <option key={b} value={b}>{branchName(b)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((g) => (
              <label key={g} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
                <input type="checkbox" className="size-3.5 accent-primary" checked={groups.includes(g)} onChange={(e) => setGroups((l) => (e.target.checked ? [...l, g] : l.filter((x) => x !== g)))} />{g.split(' · ').slice(1).join(' · ')}
              </label>
            ))}
          </div>
          {groups.length > 0 && <p className="text-xs text-muted-foreground">Selected: {groups.join(', ')}</p>}
        </fieldset>
      </div>
    </Modal>
  )
}
