'use client'

import { useState } from 'react'
import { BadgeCheck, Clock, Download, FileDown, IndianRupee, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bar, PageHeader, Panel, StatCard, selectClass } from '@/components/shared'
import { td, th } from '@/components/faculty/bits'
import { companyReport, domainReport, sectionReport, sections, stipendReport } from '@/lib/faculty-data'

const ranges = ['This semester', 'Last 30 days', 'Academic year'] as const
type Range = (typeof ranges)[number]

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="font-medium tabular-nums">{i.value}</span>
          </div>
          <Bar value={(i.value / max) * 100} />
        </li>
      ))}
    </ul>
  )
}

export function FacultyReports() {
  const [range, setRange] = useState<Range>('This semester')
  const [section, setSection] = useState('all')

  const rows = sectionReport
    .filter((r) => section === 'all' || r.section === section)
    .map((r) => ({ ...r }))
  const scale = (list: { label: string; value: number }[]) => list.filter((i) => i.value > 0)

  const students = rows.reduce((n, r) => n + r.students, 0)
  const participated = rows.reduce((n, r) => n + r.participated, 0)
  const verified = rows.reduce((n, r) => n + r.verified, 0)
  const pending = rows.reduce((n, r) => n + r.pending, 0)
  const stipends = scale(stipendReport)
  const topStipend = [...stipends].sort((a, b) => b.value - a.value)[0]
  const verifiedPct = verified + pending ? Math.round((verified / (verified + pending)) * 100) : 0
  const scopeLabel = section === 'all' ? 'all-sections' : `section-${section}`

  const exportReport = (kind: 'CSV' | 'PDF') =>
    toast.success(`${kind} export ready`, { description: `internship-report-${scopeLabel}.${kind.toLowerCase()} has been downloaded.` })

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Internship participation and verification records for your department."
        actions={
          <>
            <Button variant="outline" onClick={() => exportReport('CSV')}><Download /> Export CSV</Button>
            <Button variant="outline" onClick={() => exportReport('PDF')}><FileDown /> Export PDF</Button>
          </>
        }
      />
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Reports are not connected to Supabase yet. No sample totals or distributions are shown.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)} className={`${selectClass} sm:w-64`}>
          {ranges.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select aria-label="Section" value={section} onChange={(e) => setSection(e.target.value)} className={`${selectClass} sm:w-44`}>
          <option value="all">All sections</option>
          {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Participation" value={students ? `${Math.round((participated / students) * 100)}%` : '—'} hint={students ? `${participated} of ${students} students` : 'No live data loaded'} progress={students ? Math.round((participated / students) * 100) : undefined} icon={<Users className="size-4" />} />
        <StatCard label="Verified internships" value={students ? verified : '—'} hint={students ? `${verifiedPct}% of submissions verified` : 'No live data loaded'} icon={<BadgeCheck className="size-4" />} />
        <StatCard label="Pending verification" value={students ? pending : '—'} hint={students ? 'Awaiting faculty review' : 'No live data loaded'} icon={<Clock className="size-4" />} />
        <StatCard label="Most common stipend" value={topStipend?.label ?? '—'} hint={topStipend ? `${topStipend.value} students` : 'No data'} icon={<IndianRupee className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Participation by section" className="lg:col-span-2">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-y bg-muted/40">
                <tr>
                  <th className={`${th} pl-5`}>Section</th>
                  <th className={`${th} text-right`}>Students</th>
                  <th className={`${th} text-right`}>Participated</th>
                  <th className={th}>Rate</th>
                  <th className={`${th} text-right`}>Verified</th>
                  <th className={`${th} pr-5 text-right`}>Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const rate = Math.round((r.participated / r.students) * 100)
                  return (
                    <tr key={r.section}>
                      <td className={`${td} pl-5 font-medium`}>{r.section}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.students}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.participated}</td>
                      <td className={td}>
                        <div className="flex w-36 items-center gap-2">
                          <Bar value={rate} tone={rate >= 75 ? 'success' : rate >= 50 ? 'primary' : 'warning'} />
                          <span className="w-9 text-xs tabular-nums">{rate}%</span>
                        </div>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{r.verified}</td>
                      <td className={`${td} pr-5 text-right tabular-nums`}>{r.pending}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className={`${td} py-8 text-center text-muted-foreground`}>No report records are available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Verified vs pending">
          {sectionReport.length === 0 ? (
            <p className="text-sm text-muted-foreground">No report records are available.</p>
          ) : (
            <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${verified} verified, ${pending} pending`}>
            <div className="h-full bg-success" style={{ width: `${verifiedPct}%` }} />
            <div className="h-full bg-warning" style={{ width: `${100 - verifiedPct}%` }} />
          </div>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success" aria-hidden="true" /> Verified</dt><dd className="font-medium tabular-nums">{verified}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" aria-hidden="true" /> Pending</dt><dd className="font-medium tabular-nums">{pending}</dd></div>
          </dl>
          <h3 className="mb-3 mt-6 text-sm font-semibold">Stipend range</h3>
          <BarList items={stipends} />
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="By domain">{domainReport.length ? <BarList items={scale(domainReport)} /> : <p className="text-sm text-muted-foreground">No report records are available.</p>}</Panel>
        <Panel title="By company">{companyReport.length ? <BarList items={scale(companyReport)} /> : <p className="text-sm text-muted-foreground">No report records are available.</p>}</Panel>
      </div>
    </>
  )
}
