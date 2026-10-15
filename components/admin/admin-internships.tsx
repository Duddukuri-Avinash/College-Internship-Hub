'use client'

import { useState } from 'react'
import { AlertTriangle, Briefcase, Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal, selectClass } from '@/components/shared'
import { Pill, daysUntil, fmtDate, type Tone } from '@/components/faculty/bits'
import { Field } from '@/components/student/form-bits'
import { Confirm, FilterSelect, SearchBox, Table, Tabs } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { BRANCHES, type Company, type CompanyLabel, type Listing } from '@/lib/admin-data'
import { branchName } from '@/lib/branches'

const TABS = ['Listings', 'Companies'] as const
const srcTone: Record<Listing['source'], Tone> = { College: 'primary', 'Self-Found': 'success', Referral: 'orange' }
const labelTone: Record<CompanyLabel, Tone> = { Trusted: 'success', Neutral: 'neutral', Blocked: 'danger' }

export function InternshipControl() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Listings')
  const [company, setCompany] = useState('All')
  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Internship control" />
      {tab === 'Listings' ? <Listings company={company} setCompany={setCompany} /> : <Companies onViewListings={(c) => { setCompany(c); setTab('Listings') }} />}
    </>
  )
}

function Listings({ company, setCompany }: { company: string; setCompany: (c: string) => void }) {
  const { listings, setListings, companies, log } = useAdmin()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('All')
  const [status, setStatus] = useState('All')
  const [branch, setBranch] = useState('All')
  const [deadline, setDeadline] = useState('All')
  const [editing, setEditing] = useState<Listing | null>(null)
  const [removing, setRemoving] = useState<Listing | null>(null)
  const blocked = new Set(companies.filter((c) => c.label === 'Blocked').map((c) => c.name))

  const rows = listings.filter((l) => {
    const d = daysUntil(l.deadline)
    return (
      (!q.trim() || `${l.role} ${l.company}`.toLowerCase().includes(q.trim().toLowerCase())) &&
      (source === 'All' || l.source === source) &&
      (status === 'All' || l.status === status) &&
      (branch === 'All' || l.branches.includes(branch)) &&
      (company === 'All' || l.company === company) &&
      (deadline === 'All' || (deadline === '7' && d >= 0 && d <= 7) || (deadline === '30' && d >= 0 && d <= 30) || (deadline === 'past' && d < 0))
    )
  })

  function setListingStatus(l: Listing, s: Listing['status']) {
    setListings((list) => list.map((x) => (x.id === l.id ? { ...x, status: s } : x)))
    log(s === 'Closed' ? 'Closed listing' : 'Reopened listing', 'Opportunity', `${l.role} · ${l.company}`, { status: l.status }, { status: s })
    toast.success(`${l.role} ${s === 'Closed' ? 'closed' : 'reopened'}`)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search role or company" label="Search listings" />
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Source" value={source} onChange={setSource} options={['All', 'College', 'Self-Found', 'Referral']} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={['All', 'Open', 'Closed']} />
          <FilterSelect label="Branch" value={branch} onChange={setBranch} options={['All', ...BRANCHES.map((code) => [code, branchName(code)] as [string, string])]} />
          <FilterSelect label="Deadline" value={deadline} onChange={setDeadline} options={['All', ['7', 'Next 7 days'], ['30', 'Next 30 days'], ['past', 'Past deadline']]} />
          <FilterSelect label="Company" value={company} onChange={setCompany} options={['All', ...Array.from(new Set(listings.map((l) => l.company)))]} />
        </div>
      </div>
      <Table
        empty={{ icon: <Briefcase />, title: 'No listings match', description: 'Adjust the filters to see more listings.' }}
        head={['Role', 'Company', 'Source', 'Branches', 'Deadline', 'Applicants', 'Status', <span key="a" className="sr-only">Actions</span>]}
        rows={rows.map((l) => [
          <span key="r" className="font-medium">{l.role}</span>,
          <span key="c" className="flex flex-col gap-1">
            {l.company}
            {blocked.has(l.company) && <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" aria-hidden="true" /> Blocked company</span>}
          </span>,
          <Pill key="s" tone={srcTone[l.source]}>{l.source}</Pill>,
          <span key="b" className="text-xs">{l.branches.join(', ')}</span>,
          <span key="d" className="whitespace-nowrap tabular-nums">{fmtDate(l.deadline)}</span>,
          <span key="ap" className="tabular-nums">{l.applicants}</span>,
          <Pill key="st" tone={l.status === 'Open' ? 'success' : 'neutral'}>{l.status}</Pill>,
          <div key="x" className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`Edit ${l.role}`} onClick={() => setEditing(l)}><Pencil /></Button>
            <Button size="sm" variant="ghost" onClick={() => setListingStatus(l, l.status === 'Open' ? 'Closed' : 'Open')}>{l.status === 'Open' ? 'Close' : 'Reopen'}</Button>
            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Remove ${l.role}`} onClick={() => setRemoving(l)}><Trash2 /></Button>
          </div>,
        ])}
      />
      <ListingForm key={editing?.id ?? 'none'} listing={editing} onClose={() => setEditing(null)} />
      <Confirm
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.role}?`}
        description={`${removing?.applicants} students tracking this listing will be notified. This cannot be undone.`}
        confirmLabel="Remove listing"
        onConfirm={() => {
          if (!removing) return
          setListings((l) => l.filter((x) => x.id !== removing.id))
          log('Removed listing', 'Opportunity', `${removing.role} · ${removing.company}`)
          toast.success('Listing removed')
          setRemoving(null)
        }}
      />
    </>
  )
}

function ListingForm({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const { setListings, log } = useAdmin()
  const [role, setRole] = useState(listing?.role ?? '')
  const [deadline, setDeadline] = useState(listing?.deadline ?? '')
  const [branches, setBranches] = useState<string[]>(listing?.branches ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function save() {
    const e: Record<string, string> = {}
    if (role.trim().length < 3) e.role = 'Enter a role title.'
    if (!deadline) e.deadline = 'Pick a deadline.'
    if (!branches.length) e.branches = 'Select at least one branch.'
    setErrors(e)
    if (Object.keys(e).length || !listing) return
    setListings((l) => l.map((x) => (x.id === listing.id ? { ...x, role: role.trim(), deadline, branches } : x)))
    log('Edited listing', 'Opportunity', listing.company, { role: listing.role, deadline: listing.deadline, branches: listing.branches.join(', ') }, { role: role.trim(), deadline, branches: branches.join(', ') })
    toast.success('Listing updated')
    onClose()
  }

  return (
    <Modal open={!!listing} onClose={onClose} title="Edit listing" description={listing?.company} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save changes</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Role" htmlFor="ls-role" error={errors.role}><Input id="ls-role" value={role} onChange={(e) => setRole(e.target.value)} aria-invalid={!!errors.role || undefined} /></Field>
        <Field label="Deadline" htmlFor="ls-dl" error={errors.deadline}><Input id="ls-dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-invalid={!!errors.deadline || undefined} /></Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Eligible branches</legend>
          <div className="flex flex-wrap gap-3">
            {BRANCHES.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" checked={branches.includes(b)} onChange={(e) => setBranches((l) => (e.target.checked ? [...l, b] : l.filter((x) => x !== b)))}                 />{branchName(b)}
              </label>
            ))}
          </div>
          {errors.branches && <p className="mt-1 text-xs text-destructive" role="alert">{errors.branches}</p>}
        </fieldset>
      </div>
    </Modal>
  )
}

function Companies({ onViewListings }: { onViewListings: (c: string) => void }) {
  const { companies, setCompanies, listings, log } = useAdmin()
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [form, setForm] = useState<Company>({ name: '', label: 'Neutral', note: '' })
  const [error, setError] = useState('')

  function open(c: Company | 'new') {
    setEditing(c)
    setError('')
    setForm(c === 'new' ? { name: '', label: 'Neutral', note: '' } : c)
  }
  function save() {
    if (form.name.trim().length < 2) return setError('Enter the company name.')
    if (editing === 'new' && companies.some((c) => c.name.toLowerCase() === form.name.trim().toLowerCase())) return setError('Company already exists.')
    if (form.label === 'Blocked' && !form.note.trim()) return setError('Add a note explaining why this company is blocked.')
    if (editing === 'new') {
      setCompanies((l) => [...l, { ...form, name: form.name.trim() }])
      log('Added company', 'Opportunity', form.name.trim(), undefined, { label: form.label })
    } else if (editing) {
      setCompanies((l) => l.map((c) => (c.name === editing.name ? form : c)))
      log('Updated company label', 'Opportunity', form.name, { label: editing.label }, { label: form.label })
    }
    toast.success(form.label === 'Blocked' ? `${form.name} blocked — related listings now show a warning` : 'Company saved')
    setEditing(null)
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open('new')}><Plus /> Add company</Button></div>
      <Table
        empty={{ icon: <Building2 />, title: 'No companies yet' }}
        head={['Company', 'Label', 'Note', 'Related internships', <span key="a" className="sr-only">Actions</span>]}
        rows={companies.map((c) => {
          const n = listings.filter((l) => l.company === c.name).length
          return [
            <span key="n" className="font-medium">{c.name}</span>,
            <Pill key="l" tone={labelTone[c.label]}>{c.label}</Pill>,
            <span key="no" className="text-xs text-muted-foreground">{c.note || '—'}</span>,
            n ? <Button key="r" size="sm" variant="link" className="h-auto px-0" onClick={() => onViewListings(c.name)}>View {n} listing{n > 1 ? 's' : ''}</Button> : <span key="r" className="text-xs text-muted-foreground">None</span>,
            <div key="x" className="flex justify-end"><Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Pencil /></Button></div>,
          ]
        })}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add company' : `Edit ${form.name}`} footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label="Company name" htmlFor="co-name"><Input id="co-name" value={form.name} disabled={editing !== 'new'} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError('') }} /></Field>
          <Field label="Label" htmlFor="co-label">
            <select id="co-label" className={selectClass} value={form.label} onChange={(e) => { setForm({ ...form, label: e.target.value as CompanyLabel }); setError('') }}>
              {(['Trusted', 'Neutral', 'Blocked'] as const).map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Note" htmlFor="co-note" error={error} hint="Visible to faculty only.">
            <Textarea id="co-note" rows={3} value={form.note} onChange={(e) => { setForm({ ...form, note: e.target.value }); setError('') }} aria-invalid={!!error || undefined} />
          </Field>
        </div>
      </Modal>
    </>
  )
}
