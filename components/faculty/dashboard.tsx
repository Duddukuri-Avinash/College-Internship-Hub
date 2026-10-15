'use client'

import { ArrowRight, Award, Briefcase, ClipboardCheck, FileText, Megaphone, MessageSquare, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader, Panel, StatCard, VerifyBadge, Bar } from '@/components/shared'
import { branchStats, formatDate, verificationQueue, COLLEGE } from '@/lib/data'
import type { View } from '@/components/app-shell'

export function FacultyDashboard({ navigate }: { navigate: (v: View) => void }) {
  const pending = verificationQueue.filter((v) => v.status === 'Pending').length
  const actions = [
    { label: 'Offer letters to verify', count: verificationQueue.length ? verificationQueue.filter((v) => v.type === 'Offer Letter').length : '—', icon: <FileText className="size-4" /> },
    { label: 'Certificates to verify', count: verificationQueue.length ? verificationQueue.filter((v) => v.type === 'Certificate').length : '—', icon: <Award className="size-4" /> },
    { label: 'Self-found internships', count: verificationQueue.length ? verificationQueue.filter((v) => v.type === 'Self-Found').length : '—', icon: <Search className="size-4" /> },
    { label: 'Student requests', count: '—', icon: <MessageSquare className="size-4" /> },
  ]

  return (
    <>
      <PageHeader
        title="Faculty Dashboard"
        description={`${COLLEGE.name} · Faculty account details and department records are not connected yet.`}
        actions={
          <Button onClick={() => navigate({ name: 'post-opportunity' })}>
            <Megaphone /> Post College Opportunity
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value="—" hint="No live data loaded" icon={<Users className="size-4" />} />
        <StatCard label="Active Internships" value="—" hint="No live data loaded" icon={<Briefcase className="size-4" />} />
        <StatCard label="Pending Verifications" value={verificationQueue.length ? pending : '—'} hint="No live data loaded" icon={<ClipboardCheck className="size-4" />} />
        <StatCard label="Completed Internships" value="—" hint="No live data loaded" icon={<Award className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Faculty Action Center" className="lg:col-span-2" action={<Button variant="ghost" size="sm" onClick={() => navigate({ name: 'verification' })}>Open center <ArrowRight /></Button>}>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {actions.map((a) => (
              <button key={a.label} onClick={() => navigate({ name: 'verification' })} className="rounded-lg border bg-muted/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
                <span className="flex size-8 items-center justify-center rounded-md bg-card text-primary">{a.icon}</span>
                <p className="mt-2 text-xl font-semibold tabular-nums">{a.count}</p>
                <p className="text-xs text-muted-foreground">{a.label}</p>
              </button>
            ))}
          </div>
          <ul className="divide-y">
            {verificationQueue.slice(0, 5).map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{v.student} <span className="font-normal text-muted-foreground">· {v.regNo}</span></p>
                  <p className="text-xs text-muted-foreground">{v.type} · {v.company} · {formatDate(v.submitted)}</p>
                </div>
                <VerifyBadge status={v.status} />
              </li>
            ))}
          </ul>
          {verificationQueue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No verification records are available.</p>}
        </Panel>

        <Panel title="Department participation">
          <ul className="flex flex-col gap-4">
            {branchStats.slice(0, 5).map((b) => {
              const pct = Math.round((b.interning / b.students) * 100)
              return (
                <li key={b.branch}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{b.branch}</span><span className="tabular-nums text-muted-foreground">{pct}%</span></div>
                  <Bar value={pct} tone={pct > 50 ? 'success' : 'primary'} />
                </li>
              )
            })}
          </ul>
          {branchStats.length === 0 && <p className="text-sm text-muted-foreground">No department records are available.</p>}
        </Panel>
      </div>
    </>
  )
}
