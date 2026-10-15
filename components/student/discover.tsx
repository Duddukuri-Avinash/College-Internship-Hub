'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader, selectClass } from '@/components/shared'
import { InternshipCard } from '@/components/student/internship-card'
import { branches, daysUntil, internships } from '@/lib/data'
import type { View } from '@/components/app-shell'
import { cn } from '@/lib/utils'
import { branchName } from '@/lib/branches'

const initial = { branch: '', year: '', skill: '', location: '', mode: '', duration: '', stipend: '', deadline: '', source: '' }

export function Discover({ navigate }: { navigate: (v: View) => void }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState(initial)
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState('match')

  const skills = useMemo(() => [...new Set(internships.flatMap((i) => i.skills))].sort(), [])
  const locations = useMemo(() => [...new Set(internships.map((i) => i.location))].sort(), [])

  const results = useMemo(() => {
    const term = q.toLowerCase()
    return internships
      .filter((i) => !term || [i.company, i.role, ...i.skills].some((s) => s.toLowerCase().includes(term)))
      .filter((i) => !f.branch || i.branches.includes(f.branch))
      .filter((i) => !f.year || i.years.includes(Number(f.year)))
      .filter((i) => !f.skill || i.skills.includes(f.skill))
      .filter((i) => !f.location || i.location === f.location)
      .filter((i) => !f.mode || i.mode === f.mode)
      .filter((i) => !f.duration || (f.duration === 'short' ? parseInt(i.duration) <= 8 : parseInt(i.duration) > 8))
      .filter((i) => !f.stipend || (f.stipend === 'paid' ? i.stipend > 0 : i.stipend >= Number(f.stipend)))
      .filter((i) => !f.deadline || daysUntil(i.deadline) <= Number(f.deadline))
      .filter((i) => !f.source || i.source === f.source)
      .sort((a, b) => (sort === 'match' ? b.match - a.match : sort === 'deadline' ? daysUntil(a.deadline) - daysUntil(b.deadline) : b.stipend - a.stipend))
  }, [q, f, sort])

  const activeCount = Object.values(f).filter(Boolean).length
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  const filters: { key: keyof typeof initial; label: string; options: [string, string][] }[] = [
    { key: 'branch', label: 'Branch', options: branches.map((b) => [b, branchName(b)]) },
    { key: 'year', label: 'Year', options: [['2', '2nd Year'], ['3', '3rd Year'], ['4', '4th Year']] },
    { key: 'skill', label: 'Skills', options: skills.map((s) => [s, s]) },
    { key: 'location', label: 'Location', options: locations.map((l) => [l, l]) },
    { key: 'mode', label: 'Mode', options: [['Remote', 'Remote'], ['On-site', 'On-site'], ['Hybrid', 'Hybrid']] },
    { key: 'duration', label: 'Duration', options: [['short', 'Up to 8 weeks'], ['long', 'More than 8 weeks']] },
    { key: 'stipend', label: 'Stipend', options: [['paid', 'Paid only'], ['15000', '₹15,000+'], ['25000', '₹25,000+']] },
    { key: 'deadline', label: 'Deadline', options: [['7', 'Within 7 days'], ['14', 'Within 14 days'], ['30', 'Within 30 days']] },
    { key: 'source', label: 'Source', options: [['College Opportunity', 'College Opportunity'], ['Self-Found', 'Self-Found'], ['Senior Referral', 'Senior Referral']] },
  ]

  return (
    <>
      <PageHeader title="Find Internships" description="Opportunities curated by the Training & Placement Cell, faculty, and verified seniors." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by company, role, or skill" className="h-10 bg-card pl-9" aria-label="Search internships" />
        </div>
        <div className="flex gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={cn(selectClass, 'h-10 w-40')} aria-label="Sort by">
            <option value="match">Best match</option>
            <option value="deadline">Deadline soonest</option>
            <option value="stipend">Highest stipend</option>
          </select>
          <Button variant="outline" className="h-10 lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <SlidersHorizontal /> Filters{activeCount > 0 && ` (${activeCount})`}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className={cn('rounded-xl border bg-card p-4 lg:block lg:self-start', showFilters ? 'block' : 'hidden')} aria-label="Filters">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            {activeCount > 0 && (
              <button onClick={() => setF(initial)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <X className="size-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {filters.map((fl) => (
              <div key={fl.key} className="flex flex-col gap-1">
                <label htmlFor={`f-${fl.key}`} className="text-xs font-medium text-muted-foreground">
                  {fl.label}
                </label>
                <select id={`f-${fl.key}`} value={f[fl.key]} onChange={set(fl.key)} className={selectClass}>
                  <option value="">Any</option>
                  {fl.options.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} internship{results.length === 1 ? '' : 's'} found
          </p>
          {results.map((i) => (
            <InternshipCard key={i.id} internship={i} onOpen={() => navigate({ name: 'internship', id: i.id })} />
          ))}
          {results.length === 0 && (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center">
              <p className="font-medium">No internships match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try removing a filter or broadening your search.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setF(initial); setQ('') }}>
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
