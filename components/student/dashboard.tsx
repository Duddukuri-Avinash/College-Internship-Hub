'use client'

import { ArrowRight, CalendarClock, FileCheck2, Search, Sparkles, Target, UserRoundPen, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel, StatCard } from '@/components/shared'
import { InternshipCard } from '@/components/student/internship-card'
import { daysUntil, formatDate, internships, notifications, COLLEGE } from '@/lib/data'
import type { View } from '@/components/app-shell'
import { cn } from '@/lib/utils'
import { getInternshipReadiness, getProfileCompletion, useStudentAccount } from '@/components/student/student-account-provider'

export function StudentDashboard({ navigate }: { navigate: (v: View) => void }) {
  const { account, resume, loading } = useStudentAccount()
  const profileCompletion = getProfileCompletion(account, resume)
  const readiness = getInternshipReadiness(account, resume)
  const recommended = [...internships].sort((a, b) => b.match - a.match).slice(0, 3)
  const deadlines = [...internships].filter((i) => daysUntil(i.deadline) >= 0).sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)).slice(0, 4)
  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
        <p className="text-sm text-primary-foreground/75">{COLLEGE.name}</p>
        <h1 className="mt-1 text-balance text-2xl font-semibold sm:text-3xl">Welcome, {(account?.fullName ?? 'Student').split(' ')[0]}</h1>
        <p className="mt-2 max-w-xl text-pretty text-sm text-primary-foreground/80">
          Keep your student details up to date to get the most from InternHub.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate({ name: 'discover' })}>
            <Search /> Find Internships
          </Button>
          <Button variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate({ name: 'profile' })}>
            <UserRoundPen /> View Profile
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Your student account</h2>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading your saved details…</p>
        ) : account ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-muted-foreground">Roll number</dt><dd className="font-medium">{account.rollNumber}</dd></div>
            <div><dt className="text-muted-foreground">Personal email</dt><dd className="break-all font-medium">{account.email}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{account.phone || 'Not provided'}</dd></div>
            <div><dt className="text-muted-foreground">Branch / year / section</dt><dd className="font-medium">{account.branch === 'Unassigned' ? 'Not set' : account.branch} / {account.year} / {account.section === 'Unassigned' ? 'Not set' : account.section}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Student details are unavailable right now.</p>
        )}
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Internship and application records will appear here when they are available for your account.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Profile Completion" value={loading ? '—' : `${profileCompletion}%`} hint={loading ? 'Loading…' : 'Based on saved profile details'} icon={<UserRoundPen className="size-4" />} />
        <StatCard label="Internship Readiness" value={loading ? '—' : `${readiness}%`} hint={loading ? 'Loading…' : 'Based on saved skills and preferences'} icon={<Gauge className="size-4" />} />
        <StatCard label="Matching Opportunities" value="—" hint="No published records" icon={<Target className="size-4" />} />
        <StatCard label="Applications" value="—" hint="No application records" icon={<FileCheck2 className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden="true" /> Recommended for you
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'discover' })}>
              View all <ArrowRight />
            </Button>
          </div>
          {recommended.map((i) => (
            <InternshipCard key={i.id} internship={i} onOpen={() => navigate({ name: 'internship', id: i.id })} />
          ))}
          {recommended.length === 0 && (
            <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No published internships are available yet.</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Upcoming deadlines">
            <ul className="flex flex-col gap-3">
              {deadlines.map((i) => {
                const d = daysUntil(i.deadline)
                return (
                  <li key={i.id}>
                    <button onClick={() => navigate({ name: 'internship', id: i.id })} className="flex w-full items-center gap-3 rounded-lg text-left hover:bg-muted/60">
                      <span className={cn('flex size-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-semibold', d <= 7 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary')}>
                        <CalendarClock className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.company}</span>
                        <span className="block truncate text-xs text-muted-foreground">{formatDate(i.deadline)}</span>
                      </span>
                      <span className={cn('text-xs font-medium tabular-nums', d <= 7 ? 'text-destructive' : 'text-muted-foreground')}>{d}d left</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {deadlines.length === 0 && <p className="text-sm text-muted-foreground">No upcoming internship deadlines.</p>}
          </Panel>

          <Panel title="Recent notifications">
            <ul className="flex flex-col gap-3">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.type === 'warning' ? 'bg-warning' : n.type === 'success' ? 'bg-success' : 'bg-primary')} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
          </Panel>
        </div>
      </div>
    </>
  )
}
