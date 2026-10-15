'use client'

import { ArrowRight, Briefcase, GraduationCap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bar, PageHeader, Panel, StatCard } from '@/components/shared'
import type { View } from '@/components/app-shell'
import { linkClass } from '@/components/admin/admin-bits'
import { useAdmin } from '@/components/admin/admin-store'
import { Approvals } from '@/components/admin/admin-approvals'
import { StudentsManagement } from '@/components/admin/admin-students'
import { FacultyManagement } from '@/components/admin/admin-faculty'
import { Departments } from '@/components/admin/admin-departments'
import { RolesPermissions } from '@/components/admin/admin-roles'
import { InternshipControl } from '@/components/admin/admin-internships'
import { Moderation } from '@/components/admin/admin-moderation'
import { Announcements } from '@/components/admin/admin-announcements'
import { Reports } from '@/components/admin/admin-reports'
import { AuditLogs } from '@/components/admin/admin-audit'
import { Settings } from '@/components/admin/admin-settings'
import { COLLEGE } from '@/lib/data'

const titles: Record<string, [string, string]> = {
  overview: ['Platform Overview', `College-wide internship analytics for ${COLLEGE.name}`],
  approvals: ['Approvals', 'New faculty registrations waiting for review'],
  students: ['Manage Students', 'Profiles, eligibility, and internship records'],
  faculty: ['Manage Faculty', 'Coordinators and verification permissions'],
  departments: ['Departments & Academic Setup', 'Branches, sections, academic years, and eligibility defaults'],
  roles: ['Roles & Permissions', 'Control what each role can do across the platform'],
  internships: ['Manage Internships', 'All listings across sources'],
  moderation: ['Moderation', 'Reported posts and experience reviews'],
  announcements: ['Announcements', 'Broadcast messages to students and faculty'],
  reports: ['Reports & Exports', 'Participation, verification, and skill-gap reports'],
  audit: ['Audit Logs', 'Every verification and admin action, timestamped'],
  settings: ['Settings', 'Platform configuration'],
}

export function AdminPortal({ section, navigate }: { section: string; navigate: (v: View) => void }) {
  const [title, desc] = titles[section] ?? titles.overview
  const go = (s: string) => navigate({ name: 'admin', section: s })
  return (
    <>
      <PageHeader title={title} description={desc} />
      {section === 'overview' && <Overview go={go} />}
      {section === 'approvals' && <Approvals />}
      {section === 'students' && <StudentsManagement />}
      {section === 'faculty' && <FacultyManagement />}
      {section === 'departments' && <Departments />}
      {section === 'roles' && <RolesPermissions />}
      {section === 'internships' && <InternshipControl />}
      {section === 'moderation' && <Moderation />}
      {section === 'announcements' && <Announcements />}
      {section === 'reports' && <Reports />}
      {section === 'audit' && <AuditLogs />}
      {section === 'settings' && <Settings />}
    </>
  )
}

function Overview({ go }: { go: (s: string) => void }) {
  const { students, faculty, listings, audit } = useAdmin()
  const link = (s: string, label: string) => ({ className: linkClass, onClick: () => go(s), 'aria-label': label })
  return (
    <>
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Dashboard totals and activity are not connected to Supabase yet. No sample analytics are shown.
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <button type="button" {...link('students', 'Open Manage Students')}><StatCard label="Total Students" value="—" hint="No live data" icon={<GraduationCap className="size-4" />} /></button>
        <button type="button" {...link('faculty', 'Open Manage Faculty')}><StatCard label="Faculty Coordinators" value="—" hint="No live data" icon={<Users className="size-4" />} /></button>
        <button type="button" {...link('internships', 'Open Manage Internships')}><StatCard label="Internship Listings" value="—" hint="No live data" icon={<Briefcase className="size-4" />} /></button>
        <button type="button" {...link('audit', 'Open Audit Logs')}><StatCard label="Audit Records" value="—" hint="No live data" icon={<Users className="size-4" />} /></button>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Students" action={<Button variant="ghost" size="sm" onClick={() => go('students')}>Manage <ArrowRight /></Button>}>
          <p className="text-sm text-muted-foreground">{students.length ? `${students.length} in this session` : 'No student records loaded.'}</p>
        </Panel>
        <Panel title="Faculty" action={<Button variant="ghost" size="sm" onClick={() => go('faculty')}>Manage <ArrowRight /></Button>}>
          <p className="text-sm text-muted-foreground">{faculty.length ? `${faculty.length} in this session` : 'No faculty records loaded.'}</p>
        </Panel>
        <Panel title="Internships" action={<Button variant="ghost" size="sm" onClick={() => go('internships')}>Manage <ArrowRight /></Button>}>
          <p className="text-sm text-muted-foreground">{listings.length ? `${listings.length} in this session` : 'No internship listings loaded.'}</p>
        </Panel>
        <Panel title="Recent activity" action={<Button variant="ghost" size="sm" onClick={() => go('audit')}>All <ArrowRight /></Button>}>
          <ul className="flex flex-col gap-3">
            {audit.slice(0, 4).map((l) => (
              <li key={l.id} className="flex gap-2.5">
                <div><p className="text-sm font-medium">{l.action}</p><p className="text-xs text-muted-foreground">{l.actor} · {l.target}</p></div>
              </li>
            ))}
          </ul>
          {audit.length === 0 && <p className="text-sm text-muted-foreground">No activity records loaded.</p>}
        </Panel>
      </div>
    </>
  )
}
