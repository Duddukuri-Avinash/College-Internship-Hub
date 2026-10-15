'use client'

import { useMemo, useState } from 'react'
import { Columns3, Download, FileUp, MoreHorizontal, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Bar, Modal, VerifyBadge, selectClass } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Confirm, Drawer, FilterSelect, Pagination, SearchBox, Table, downloadFile } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { BRANCHES, COLLEGE_DOMAIN, SECTIONS, YEARS, type AdminStudent } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'

const COLUMNS = ['Roll No', 'Branch', 'Year', 'Section', 'CGPA', 'Internship', 'Profile', 'Status'] as const
type Col = (typeof COLUMNS)[number]
const PAGE = 8

type Form = { name: string; roll: string; branch: string; year: string; section: string; email: string; phone: string }
const emptyForm: Form = { name: '', roll: '', branch: 'CSE', year: '3', section: 'A', email: '', phone: '' }

function validate(f: Form, existing: AdminStudent[], selfId?: string) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.name.trim().length < 3) e.name = 'Enter the full name.'
  if (!/^Y\d{2}[A-Z]{2}\d{3}$/.test(f.roll.trim().toUpperCase())) e.roll = 'Enter a valid college roll number.'
  else if (existing.some((s) => s.roll === f.roll.trim().toUpperCase() && s.id !== selfId)) e.roll = 'Roll number already exists.'
  if (!(BRANCHES as readonly string[]).includes(f.branch)) e.branch = 'Unknown branch.'
  if (!['1', '2', '3', '4'].includes(f.year)) e.year = 'Year must be 1–4.'
  if (!(SECTIONS as readonly string[]).includes(f.section.toUpperCase())) e.section = 'Section must be A, B, or C.'
  if (!f.email.trim().toLowerCase().endsWith(COLLEGE_DOMAIN)) e.email = `Must end with ${COLLEGE_DOMAIN}.`
  if (!/^\d{10}$/.test(f.phone.replace(/\s/g, ''))) e.phone = 'Enter a 10-digit number.'
  return e
}

function toStudent(f: Form, id: string): AdminStudent {
  return {
    id, name: f.name.trim(), roll: f.roll.trim().toUpperCase(), branch: f.branch, year: Number(f.year), section: f.section.toUpperCase(),
    email: f.email.trim().toLowerCase(), phone: f.phone.trim(), cgpa: 0, status: 'Active', internship: 'None', internships: 0, profile: 20, resume: 0, docs: [],
    activity: [{ time: new Date().toLocaleString(), text: 'Added during this session' }],
  }
}

const internTone = { Interning: 'primary', Completed: 'success', Applied: 'warning', None: 'neutral' } as const

export function StudentsManagement() {
  const { students, setStudents, log } = useAdmin()
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('All')
  const [year, setYear] = useState('All')
  const [section, setSection] = useState('All')
  const [status, setStatus] = useState('All')
  const [intern, setIntern] = useState('All')
  const [page, setPage] = useState(1)
  const [cols, setCols] = useState<Col[]>([...COLUMNS])
  const [viewing, setViewing] = useState<AdminStudent | null>(null)
  const [editing, setEditing] = useState<AdminStudent | 'new' | null>(null)
  const [toggling, setToggling] = useState<AdminStudent | null>(null)
  const [resetting, setResetting] = useState<AdminStudent | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return students.filter((s) =>
      (!t || s.name.toLowerCase().includes(t) || s.roll.toLowerCase().includes(t) || s.email.includes(t)) &&
      (branch === 'All' || s.branch === branch) &&
      (year === 'All' || s.year === Number(year)) &&
      (section === 'All' || s.section === section) &&
      (status === 'All' || s.status === status) &&
      (intern === 'All' || s.internship === intern),
    )
  }, [students, q, branch, year, section, status, intern])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages)
  const shown = filtered.slice((current - 1) * PAGE, current * PAGE)
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }
  const has = (c: Col) => cols.includes(c)

  const cell: Record<Col, (s: AdminStudent) => React.ReactNode> = {
    'Roll No': (s) => <span className="font-mono text-xs">{s.roll}</span>,
    Branch: (s) => s.branch,
    Year: (s) => s.year,
    Section: (s) => s.section,
    CGPA: (s) => <span className="tabular-nums">{s.cgpa ? s.cgpa.toFixed(1) : '—'}</span>,
    Internship: (s) => <Pill tone={internTone[s.internship]}>{s.internship === 'None' ? 'No internship' : s.internship}</Pill>,
    Profile: (s) => <div className="flex w-28 items-center gap-2"><Bar value={s.profile} /><span className="text-xs tabular-nums">{s.profile}%</span></div>,
    Status: (s) => <Pill tone={s.status === 'Active' ? 'success' : 'neutral'}>{s.status}</Pill>,
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SearchBox value={q} onChange={reset(setQ)} placeholder="Search by name, roll no. or email" label="Search students" />
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
              <Columns3 className="size-4" aria-hidden="true" /> Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked={has(c)} onCheckedChange={(v) => setCols((l) => (v ? COLUMNS.filter((x) => x === c || l.includes(x)) : l.filter((x) => x !== c)))}>{c}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setImporting(true)}><FileUp /> Bulk import</Button>
          <Button onClick={() => setEditing('new')}><Plus /> Add student</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <FilterSelect label="Branch" value={branch} onChange={reset(setBranch)} options={['All', ...BRANCHES.map((code) => [code, branchName(code)] as [string, string])]} />
        <FilterSelect label="Year" value={year} onChange={reset(setYear)} options={['All', ...YEARS.map((y) => [String(y), `Year ${y}`] as [string, string])]} />
        <FilterSelect label="Section" value={section} onChange={reset(setSection)} options={['All', ...SECTIONS]} />
        <FilterSelect label="Status" value={status} onChange={reset(setStatus)} options={['All', 'Active', 'Inactive']} />
        <FilterSelect label="Internship status" value={intern} onChange={reset(setIntern)} options={['All', 'Interning', 'Completed', 'Applied', ['None', 'No internship']]} />
      </div>

      <Table
        empty={{ icon: <Users />, title: 'No students match', description: 'Try clearing a filter or searching by roll number.' }}
        head={['Student', ...cols, <span key="a" className="sr-only">Actions</span>]}
        rows={shown.map((s) => [
          <button key="n" className="text-left font-medium outline-none hover:text-primary focus-visible:underline" onClick={() => setViewing(s)}>{s.name}</button>,
          ...cols.map((c) => <span key={c}>{cell[c](s)}</span>),
          <DropdownMenu key="x">
            <DropdownMenuTrigger aria-label={`Actions for ${s.name}`} className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setViewing(s)}>View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing(s)}>Edit details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResetting(s)}>Reset password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant={s.status === 'Active' ? 'destructive' : 'default'} onClick={() => setToggling(s)}>{s.status === 'Active' ? 'Deactivate' : 'Reactivate'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>,
        ])}
      />
      <Pagination page={current} pages={pages} total={filtered.length} onPage={setPage} />

      <StudentForm
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        open={!!editing}
        student={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={(f) => {
          if (editing === 'new') {
            setStudents((l) => [toStudent(f, `s${Date.now()}`), ...l])
            log('Added student', 'User management', `${f.name} · ${f.roll.toUpperCase()}`)
            toast.success(`${f.name} added. Login details emailed to ${f.email}.`)
          } else if (editing) {
            const next = { ...editing, name: f.name.trim(), roll: f.roll.toUpperCase(), branch: f.branch, year: Number(f.year), section: f.section.toUpperCase(), email: f.email.toLowerCase(), phone: f.phone }
            setStudents((l) => l.map((s) => (s.id === editing.id ? next : s)))
            log('Edited student details', 'User management', next.roll, { branch: editing.branch, year: String(editing.year), section: editing.section, email: editing.email }, { branch: next.branch, year: String(next.year), section: next.section, email: next.email })
            toast.success('Student details updated')
          }
          setEditing(null)
        }}
      />

      <Confirm
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={`${toggling?.status === 'Active' ? 'Deactivate' : 'Reactivate'} ${toggling?.name}?`}
        description={toggling?.status === 'Active' ? 'They will be signed out and cannot log in. Their internship records are kept.' : 'They will be able to sign in again.'}
        confirmLabel={toggling?.status === 'Active' ? 'Deactivate' : 'Reactivate'}
        destructive={toggling?.status === 'Active'}
        onConfirm={() => {
          if (!toggling) return
          const next = toggling.status === 'Active' ? 'Inactive' : 'Active'
          setStudents((l) => l.map((s) => (s.id === toggling.id ? { ...s, status: next } : s)))
          log(next === 'Inactive' ? 'Deactivated student' : 'Reactivated student', 'User management', toggling.roll, { status: toggling.status }, { status: next })
          toast.success(`${toggling.name} ${next === 'Inactive' ? 'deactivated' : 'reactivated'}`)
          setToggling(null)
        }}
      />
      <Confirm
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={`Reset password for ${resetting?.name}?`}
        description={`A one-time reset link will be sent to ${resetting?.email}. Their current password stops working immediately.`}
        confirmLabel="Send reset link"
        destructive={false}
        onConfirm={() => {
          if (!resetting) return
          log('Reset student password', 'User management', resetting.roll)
          toast.success('Password reset link sent')
          setResetting(null)
        }}
      />

      <StudentDrawer student={viewing ? students.find((s) => s.id === viewing.id) ?? viewing : null} onClose={() => setViewing(null)} onEdit={(s) => { setViewing(null); setEditing(s) }} />
      <BulkImport open={importing} onClose={() => setImporting(false)} />
    </>
  )
}

function StudentForm({ open, student, onClose, onSave }: { open: boolean; student: AdminStudent | null; onClose: () => void; onSave: (f: Form) => void }) {
  const { students } = useAdmin()
  const [f, setF] = useState<Form>(student ? { name: student.name, roll: student.roll, branch: student.branch, year: String(student.year), section: student.section, email: student.email, phone: student.phone } : emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const inv = (k: keyof Form) => !!errors[k] || undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? `Edit ${student.name}` : 'Add student'}
      description={student ? undefined : 'The student receives a login invite at their college email.'}
      size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { const e = validate(f, students, student?.id); setErrors(e); if (!Object.keys(e).length) onSave(f) }}>{student ? 'Save changes' : 'Add student'}</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="sf-name" error={errors.name}><Input id="sf-name" value={f.name} onChange={set('name')} aria-invalid={inv('name')} /></Field>
        <Field label="Roll No" htmlFor="sf-roll" error={errors.roll}><Input id="sf-roll" value={f.roll} onChange={set('roll')} aria-invalid={inv('roll')} /></Field>
        <Field label="Branch" htmlFor="sf-branch" error={errors.branch}>
          <select id="sf-branch" className={selectClass} value={f.branch} onChange={set('branch')}>{BRANCHES.map((b) => <option key={b} value={b}>{branchName(b)}</option>)}</select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year" htmlFor="sf-year"><select id="sf-year" className={selectClass} value={f.year} onChange={set('year')}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></Field>
          <Field label="Section" htmlFor="sf-sec"><select id="sf-sec" className={selectClass} value={f.section} onChange={set('section')}>{SECTIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="College email" htmlFor="sf-email" error={errors.email}><Input id="sf-email" type="email" value={f.email} onChange={set('email')} placeholder={`name${COLLEGE_DOMAIN}`} aria-invalid={inv('email')} /></Field>
        <Field label="Phone" htmlFor="sf-phone" error={errors.phone}><Input id="sf-phone" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="9876543210" aria-invalid={inv('phone')} /></Field>
      </div>
    </Modal>
  )
}

function StudentDrawer({ student: s, onClose, onEdit }: { student: AdminStudent | null; onClose: () => void; onEdit: (s: AdminStudent) => void }) {
  return (
    <Drawer open={!!s} onClose={onClose} title={s?.name ?? ''} description={s ? `${s.roll} · ${s.branch} · Year ${s.year} · Section ${s.section}` : undefined}>
      {s && (
        <div className="flex flex-col gap-6 text-sm">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</h3>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-muted-foreground">Email</dt><dd className="break-all">{s.email}</dd>
              <dt className="text-muted-foreground">Phone</dt><dd>{s.phone}</dd>
              <dt className="text-muted-foreground">CGPA</dt><dd>{s.cgpa ? s.cgpa.toFixed(1) : '—'}</dd>
              <dt className="text-muted-foreground">Status</dt><dd><Pill tone={s.status === 'Active' ? 'success' : 'neutral'}>{s.status}</Pill></dd>
            </dl>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Readiness</h3>
            <div><div className="mb-1 flex justify-between"><span>Profile completion</span><span className="tabular-nums">{s.profile}%</span></div><Bar value={s.profile} /></div>
            <div><div className="mb-1 flex justify-between"><span>Resume readiness</span><span className="tabular-nums">{s.resume}%</span></div><Bar value={s.resume} tone={s.resume >= 70 ? 'success' : 'warning'} /></div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internships</h3>
            <p><Pill tone={internTone[s.internship]}>{s.internship === 'None' ? 'No internship' : s.internship}</Pill> <span className="ml-1 text-muted-foreground">{s.internships} recorded</span></p>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents</h3>
            {s.docs.length ? (
              <ul className="flex flex-col gap-2">{s.docs.map((d) => <li key={d.name} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"><span>{d.name}</span><VerifyBadge status={d.status} /></li>)}</ul>
            ) : <p className="text-muted-foreground">No documents uploaded.</p>}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</h3>
            <ol className="flex flex-col gap-2 border-l pl-4">{s.activity.map((a) => <li key={a.time}><p>{a.text}</p><p className="text-xs tabular-nums text-muted-foreground">{a.time}</p></li>)}</ol>
          </section>
          <Button variant="outline" className="w-fit" onClick={() => onEdit(s)}>Edit details</Button>
        </div>
      )}
    </Drawer>
  )
}

const TEMPLATE = 'Name,Roll No,Branch,Year,Section,College Email,Phone\n'

type Row = { form: Form; errors: string[] }

function parseCsv(text: string, existing: AdminStudent[]): Row[] {
  const lines = text.trim().split(/\r?\n/).slice(1).filter(Boolean)
  const seen = new Set<string>()
  return lines.map((line) => {
    const [name = '', roll = '', branch = '', year = '', section = '', email = '', phone = ''] = line.split(',').map((c) => c.trim())
    const form = { name, roll, branch, year, section, email, phone }
    const errs = Object.values(validate(form, existing)).filter(Boolean) as string[]
    if (seen.has(roll.toUpperCase())) errs.push('Duplicate roll in file.')
    seen.add(roll.toUpperCase())
    return { form, errors: errs }
  })
}

function BulkImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { students, setStudents, log } = useAdmin()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [file, setFile] = useState('')
  const valid = rows?.filter((r) => !r.errors.length) ?? []

  function close() {
    setRows(null)
    setFile('')
    onClose()
  }
  function load(name: string, text: string) {
    setFile(name)
    setRows(parseCsv(text, students))
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Bulk import students"
      description={rows ? `Step 2 of 2 · Review ${file}` : 'Step 1 of 2 · Upload a CSV using the template columns.'}
      footer={
        rows ? (
          <>
            <Button variant="outline" onClick={() => setRows(null)}>Back</Button>
            <Button
              disabled={!valid.length}
              onClick={() => {
                setStudents((l) => [...valid.map((r, i) => toStudent(r.form, `s${Date.now()}${i}`)), ...l])
                log('Bulk imported students', 'User management', `${valid.length} students from ${file}`)
                toast.success(`${valid.length} students imported${rows.length - valid.length ? `, ${rows.length - valid.length} skipped` : ''}`)
                close()
              }}
            >
              Import {valid.length} valid row{valid.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : <Button variant="outline" onClick={close}>Cancel</Button>
      }
    >
      {!rows ? (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center text-sm outline-none focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/40">
            <FileUp className="size-6 text-primary" aria-hidden="true" />
            <span className="font-medium">Choose a CSV file</span>
            <span className="text-xs text-muted-foreground">Columns: Name, Roll No, Branch, Year, Section, College Email, Phone</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (!f.name.toLowerCase().endsWith('.csv')) return toast.error('Please upload a .csv file')
                f.text().then((t) => load(f.name, t))
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile('student-import-template.csv', TEMPLATE)}><Download /> Download template</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm"><span className="font-medium text-success">{valid.length} ready</span> · <span className="font-medium text-destructive">{rows.length - valid.length} with errors</span> (rows with errors are skipped)</p>
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                <tr>{['#', 'Name', 'Roll No', 'Branch', 'Year', 'Sec', 'Email', 'Validation'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? 'border-t bg-destructive/5' : 'border-t'}>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 2}</td>
                    <td className="px-3 py-2">{r.form.name}</td>
                    <td className="px-3 py-2 font-mono">{r.form.roll}</td>
                    <td className="px-3 py-2">{r.form.branch}</td>
                    <td className="px-3 py-2">{r.form.year}</td>
                    <td className="px-3 py-2">{r.form.section}</td>
                    <td className="max-w-40 truncate px-3 py-2">{r.form.email}</td>
                    <td className="px-3 py-2">{r.errors.length ? <span className="text-destructive">{r.errors.join(' ')}</span> : <span className="text-success">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
