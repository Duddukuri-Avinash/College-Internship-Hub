'use client'

import { Bookmark, CalendarDays, Clock, IndianRupee, MapPin } from 'lucide-react'
import { Chip, MatchRing, SourceBadge } from '@/components/shared'
import { daysUntil, formatDate, type Internship } from '@/lib/data'

export function InternshipCard({ internship: i, onOpen }: { internship: Internship; onOpen: () => void }) {
  const days = daysUntil(i.deadline)
  return (
    <article className="group rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-md sm:p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary" aria-hidden="true">
          {i.company.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={i.source} />
            {days <= 7 && <span className="text-xs font-medium text-destructive">Closing soon</span>}
          </div>
          <h3 className="mt-1.5 font-semibold leading-snug">
            <button onClick={onOpen} className="text-left hover:text-primary focus-visible:underline">
              {i.role}
            </button>
          </h3>
          <p className="text-sm text-muted-foreground">{i.company}</p>
        </div>
        <MatchRing value={i.match} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {i.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-4">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          <dt className="sr-only">Duration</dt>
          <dd>{i.duration}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5" aria-hidden="true" />
          <dt className="sr-only">Mode</dt>
          <dd>
            {i.mode} · {i.location}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <IndianRupee className="size-3.5" aria-hidden="true" />
          <dt className="sr-only">Stipend</dt>
          <dd>{i.stipend ? `${i.stipend.toLocaleString('en-IN')}/mo` : 'Unpaid'}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <dt className="sr-only">Deadline</dt>
          <dd>{formatDate(i.deadline)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Eligible: {i.branches.join(', ')} · Year {i.years.join(', ')} · CGPA {i.minCgpa}+
        </p>
        <Bookmark className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
    </article>
  )
}
