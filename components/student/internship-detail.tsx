'use client'

import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react'
import { Chip, MatchRing, Panel, SourceBadge } from '@/components/shared'
import { daysUntil, formatDate, internships, student } from '@/lib/data'
import type { View } from '@/components/app-shell'

export function InternshipDetail({ id, navigate }: { id: string; navigate: (v: View) => void }) {
  const i = internships.find((x) => x.id === id) ?? internships[0]

  if (!i) {
    return (
      <>
        <button onClick={() => navigate({ name: 'discover' })} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to internships
        </button>
        <div className="rounded-xl border bg-card p-8 text-center">
          <h1 className="font-semibold">Internship not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">There are no published internship records to display.</p>
        </div>
      </>
    )
  }

  const facts: [string, string][] = [
    ['Duration', i.duration],
    ['Mode', i.mode],
    ['Location', i.location],
    ['Stipend', i.stipend ? `₹${i.stipend.toLocaleString('en-IN')}/month` : 'Unpaid'],
    ['Deadline', `${formatDate(i.deadline)} (${daysUntil(i.deadline)} days)`],
  ]

  return (
    <>
      <button onClick={() => navigate({ name: 'discover' })} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to internships
      </button>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-primary" aria-hidden="true">
          {i.company.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1">
          <SourceBadge source={i.source} />
          <h1 className="mt-1.5 text-balance text-2xl font-semibold">{i.role}</h1>
          <p className="text-muted-foreground">{i.company}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="About the internship">
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{i.description}</p>
          </Panel>
          <Panel title="Eligibility">
            <ul className="flex flex-col gap-2 text-sm">
              {[
                [`Branches: ${i.branches.join(', ')}`, i.branches.includes(student.branch)],
                [`Year of study: ${i.years.map((y) => `${y}${y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'}`).join(', ')}`, i.years.includes(student.year)],
                [`Minimum CGPA: ${i.minCgpa}`, student.cgpa >= i.minCgpa],
              ].map(([label, ok]) => (
                <li key={label as string} className="flex items-center gap-2">
                  {ok ? <CheckCircle2 className="size-4 text-success" aria-label="Eligible" /> : <CircleAlert className="size-4 text-destructive" aria-label="Not eligible" />}
                  {label}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Required skills">
            <div className="flex flex-wrap gap-2">
              {i.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Why this matches you">
            <div className="mb-4 flex items-center gap-3">
              <MatchRing value={i.match} />
              <p className="text-sm text-muted-foreground">Based on your skills, branch, year, and CGPA.</p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {i.matchReasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {r}
                </li>
              ))}
              {i.missingSkills.map((s) => (
                <li key={s} className="flex gap-2 text-muted-foreground">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /> Missing skill: {s}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Details">
            <dl className="flex flex-col gap-2.5 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <a href={i.link} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Official application link <ExternalLink className="size-3.5" />
            </a>
          </Panel>
        </div>
      </div>

    </>
  )
}
