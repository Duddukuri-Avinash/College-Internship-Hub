'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, Panel, selectClass } from '@/components/shared'
import { Pill } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Confirm, FilterSelect, Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { facultyPerBranch, SECTIONS, YEARS, type Branch } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'

const TABS = ['Branches', 'Sections', 'Academic years', 'Eligibility defaults'] as const
type Tab = (typeof TABS)[number]

export function Departments() {
  const [tab, setTab] = useState<Tab>('Branches')
  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Academic setup" />
      {tab === 'Branches' && <Branches />}
      {tab === 'Sections' && <Sections />}
      {tab === 'Academic years' && <Years />}
      {tab === 'Eligibility defaults' && <Eligibility />}
    </>
  )
}

function Branches() {
  const { branches, setBranches, faculty, log } = useAdmin()
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)
  const [archiving, setArchiving] = useState<Branch | null>(null)
  const [form, setForm] = useState({ code: '', name: '' })
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})

  const facultyCount = (code: string) => Math.max(facultyPerBranch[code] ?? 0, faculty.filter((f) => f.dept === code && f.status === 'Active').length)

  function open(b: Branch | 'new') {
    setEditing(b)
    setErrors({})
    setForm(b === 'new' ? { code: '', name: '' } : { code: b.code, name: b.name })
  }

  function save() {
    const er: typeof errors = {}
    if (!/^[A-Za-z&-]{2,8}$/.test(form.code.trim())) er.code = 'Use 2–8 letters, ampersands or hyphens, e.g. CSE-AIML.'
    else if (editing === 'new' && branches.some((b) => b.code.toLowerCase() === form.code.trim().toLowerCase())) er.code = 'This code already exists.'
    if (form.name.trim().length < 3) er.name = 'Enter the full branch name.'
    setErrors(er)
    if (Object.keys(er).length) return
    if (editing === 'new') {
      setBranches((l) => [...l, { code: form.code.trim(), name: form.name.trim(), students: 0, archived: false }])
      log('Added branch', 'Settings', form.code.trim())
      toast.success('Branch added')
    } else if (editing) {
      setBranches((l) => l.map((b) => (b.code === editing.code ? { ...b, name: form.name.trim() } : b)))
      log('Renamed branch', 'Settings', editing.code, { name: editing.name }, { name: form.name.trim() })
      toast.success('Branch updated')
    }
    setEditing(null)
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open('new')}><Plus /> Add branch</Button></div>
      <Table
        head={['Code', 'Branch', 'Students', 'Faculty', 'Status', <span key="a" className="sr-only">Actions</span>]}
        rows={branches.map((b) => [
          <span key="c" className="font-mono text-xs font-medium">{b.code}</span>,
          <span key="n" className="font-medium">{b.name}</span>,
          <span key="s" className="tabular-nums">{b.students.toLocaleString('en-IN')}</span>,
          <span key="f" className="tabular-nums">{b.archived ? 0 : facultyCount(b.code)}</span>,
          b.archived ? <Pill key="st">Archived</Pill> : <Pill key="st" tone="success">Active</Pill>,
          <div key="x" className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`Edit ${b.code}`} onClick={() => open(b)}><Pencil /></Button>
            {b.archived ? (
              <Button size="icon" variant="ghost" aria-label={`Restore ${b.code}`} onClick={() => { setBranches((l) => l.map((x) => (x.code === b.code ? { ...x, archived: false } : x))); toast.success(`${b.code} restored`) }}><ArchiveRestore /></Button>
            ) : (
              <Button size="icon" variant="ghost" aria-label={`Archive ${b.code}`} onClick={() => setArchiving(b)}><Archive /></Button>
            )}
          </div>,
        ])}
      />
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add branch' : 'Edit branch'}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="flex flex-col gap-4">
          <Field label="Branch code" htmlFor="br-code" error={errors.code}>
            <Input id="br-code" value={form.code} disabled={editing !== 'new'} onChange={(e) => setForm({ ...form, code: e.target.value })} aria-invalid={!!errors.code || undefined} />
          </Field>
          <Field label="Branch name" htmlFor="br-name" error={errors.name}>
            <Input id="br-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name || undefined} />
          </Field>
        </div>
      </Modal>
      <Confirm
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title={`Archive ${archiving?.code}?`}
        description={`${archiving?.students.toLocaleString('en-IN')} students and their records are kept, but the branch is hidden from new listings and registrations.`}
        confirmLabel="Archive branch"
        onConfirm={() => {
          if (!archiving) return
          setBranches((l) => l.map((x) => (x.code === archiving.code ? { ...x, archived: true } : x)))
          log('Archived branch', 'Settings', archiving.code)
          toast.success(`${archiving.code} archived`)
          setArchiving(null)
        }}
      />
    </>
  )
}

function Sections() {
  const { sections, setSections, branches, students, log } = useAdmin()
  const active = branches.filter((b) => !b.archived).map((b) => b.code)
  const [branch, setBranch] = useState(active[0] ?? 'CSE')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ year: '3', name: '' })
  const [error, setError] = useState('')

  const list = sections.filter((s) => s.branch === branch)
  const studentCount = (b: string, y: number, s: string) => students.filter((x) => x.branch === b && x.year === y && x.section === s).length

  function add() {
    const name = form.name.trim().toUpperCase()
    if (!/^[A-Z]$/.test(name)) return setError('Use a single letter, e.g. D.')
    if (sections.some((s) => s.branch === branch && s.year === Number(form.year) && s.name === name)) return setError('This section already exists.')
    setSections((l) => [...l, { id: `${branch}-${form.year}-${name}`, branch, year: Number(form.year), name, archived: false }])
    log('Added section', 'Settings', `${branch} · Year ${form.year} · ${name}`)
    toast.success('Section added')
    setAdding(false)
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterSelect label="Branch" value={branch} onChange={setBranch} options={active.map((code) => [code, branchName(code)])} />
        <Button onClick={() => { setForm({ year: '3', name: '' }); setError(''); setAdding(true) }}><Plus /> Add section</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {YEARS.map((y) => (
          <Panel key={y} title={`Year ${y}`}>
            <ul className="flex flex-col gap-2">
              {list.filter((s) => s.year === y).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className={s.archived ? 'text-muted-foreground line-through' : 'font-medium'}>Section {s.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{studentCount(branch, y, s.name)} listed</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`${s.archived ? 'Restore' : 'Archive'} section ${s.name}`}
                      onClick={() => {
                        setSections((l) => l.map((x) => (x.id === s.id ? { ...x, archived: !x.archived } : x)))
                        toast.success(`Section ${s.name} ${s.archived ? 'restored' : 'archived'}`)
                      }}
                    >
                      {s.archived ? <ArchiveRestore /> : <Archive />}
                    </Button>
                  </span>
                </li>
              ))}
              {!list.some((s) => s.year === y) && <li className="text-sm text-muted-foreground">No sections yet.</li>}
            </ul>
          </Panel>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title={`Add section to ${branch}`} footer={<><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add}>Add section</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Year" htmlFor="sec-year">
            <select id="sec-year" className={selectClass} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
              {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </Field>
          <Field label="Section" htmlFor="sec-name" error={error} hint={`Existing: ${SECTIONS.join(', ')}`}>
            <Input id="sec-name" maxLength={1} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError('') }} aria-invalid={!!error || undefined} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

function Years() {
  const { years, setYears, setSettings, log } = useAdmin()
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const v = label.trim().replace('-', '–')
    if (!/^\d{4}–\d{2}$/.test(v)) return setError('Use the format 2027–28.')
    if (years.some((y) => y.label === v)) return setError('This academic year already exists.')
    setYears((l) => [{ id: `ay${Date.now()}`, label: v, current: false, archived: false }, ...l])
    toast.success('Academic year added')
    setLabel('')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Table
        head={['Academic year', 'Status', <span key="a" className="sr-only">Actions</span>]}
        rows={years.map((y) => [
          <span key="l" className="font-medium tabular-nums">{y.label}</span>,
          y.current ? <Pill key="s" tone="primary"><Star className="size-3" /> Current</Pill> : y.archived ? <Pill key="s">Archived</Pill> : <Pill key="s" tone="success">Active</Pill>,
          <div key="x" className="flex justify-end gap-2">
            {!y.current && !y.archived && (
              <Button size="sm" variant="outline" onClick={() => {
                const prev = years.find((x) => x.current)?.label ?? ''
                setYears((l) => l.map((x) => ({ ...x, current: x.id === y.id })))
                setSettings((s) => ({ ...s, academicYear: y.label }))
                log('Changed current academic year', 'Settings', 'Academic year', { current: prev }, { current: y.label })
                toast.success(`${y.label} is now the current academic year`)
              }}>Mark current</Button>
            )}
            {!y.current && (
              <Button size="sm" variant="ghost" onClick={() => setYears((l) => l.map((x) => (x.id === y.id ? { ...x, archived: !x.archived } : x)))}>
                {y.archived ? 'Restore' : 'Archive'}
              </Button>
            )}
          </div>,
        ])}
      />
      <Panel title="Add academic year">
        <form onSubmit={add} className="flex flex-col gap-3" noValidate>
          <Field label="Label" htmlFor="ay-label" error={error}>
            <Input id="ay-label" placeholder="2027–28" value={label} onChange={(e) => { setLabel(e.target.value); setError('') }} aria-invalid={!!error || undefined} />
          </Field>
          <Button type="submit" className="w-fit"><Plus /> Add year</Button>
        </form>
      </Panel>
    </div>
  )
}

function Eligibility() {
  const { eligibility, setEligibility, log } = useAdmin()
  const [cgpa, setCgpa] = useState(String(eligibility.minCgpa))
  const [years, setYears] = useState<number[]>(eligibility.years)
  const [errors, setErrors] = useState<{ cgpa?: string; years?: string }>({})

  function save(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(cgpa)
    const er: typeof errors = {}
    if (!cgpa || Number.isNaN(n) || n < 0 || n > 10) er.cgpa = 'Enter a CGPA between 0 and 10.'
    if (!years.length) er.years = 'Allow at least one year.'
    setErrors(er)
    if (Object.keys(er).length) return
    log('Updated eligibility defaults', 'Settings', 'Eligibility', { 'Min CGPA': String(eligibility.minCgpa), Years: eligibility.years.join(', ') }, { 'Min CGPA': String(n), Years: years.join(', ') })
    setEligibility({ minCgpa: n, years: [...years].sort() })
    toast.success('Eligibility defaults saved')
  }

  return (
    <Panel title="Default eligibility for new opportunities" className="max-w-xl">
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted-foreground">Faculty can override these when posting an opportunity.</p>
        <Field label="Minimum CGPA" htmlFor="el-cgpa" error={errors.cgpa}>
          <Input id="el-cgpa" type="number" step="0.1" min={0} max={10} className="max-w-32" value={cgpa} onChange={(e) => setCgpa(e.target.value)} aria-invalid={!!errors.cgpa || undefined} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Allowed years</legend>
          <div className="flex flex-wrap gap-4">
            {YEARS.map((y) => (
              <label key={y} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" checked={years.includes(y)} onChange={(e) => setYears((l) => (e.target.checked ? [...l, y] : l.filter((x) => x !== y)))} />
                Year {y}
              </label>
            ))}
          </div>
          {errors.years && <p className="text-xs text-destructive" role="alert">{errors.years}</p>}
        </fieldset>
        <Button type="submit" className="w-fit">Save defaults</Button>
      </form>
    </Panel>
  )
}
