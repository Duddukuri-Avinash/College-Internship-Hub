'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bell,
  BookOpenCheck,
  Briefcase,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
  BarChart3,
  Settings,
  ScrollText,
  Flag,
  Building2,
  UserRound,
  FileSearch,
  Route,
  FilePlus2,
  Inbox,
  Send,
  UserCheck,
  Landmark,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLLEGE } from '@/lib/data'

export type Role = 'student' | 'faculty' | 'admin'

export type View =
  | { name: 'student-dashboard' }
  | { name: 'discover' }
  | { name: 'internship'; id: string }
  | { name: 'my-internships' }
  | { name: 'seniors' }
  | { name: 'experience'; id: string }
  | { name: 'share-experience' }
  | { name: 'profile' }
  | { name: 'onboarding' }
  | { name: 'resume-analysis' }
  | { name: 'roadmap' }
  | { name: 'submit-internship' }
  | { name: 'settings' }
  | { name: 'faculty-dashboard' }
  | { name: 'post-opportunity'; editId?: string }
  | { name: 'verification'; tab?: string }
  | { name: 'faculty-opportunities' }
  | { name: 'faculty-students'; quick?: 'without' }
  | { name: 'faculty-student'; id: string }
  | { name: 'faculty-requests' }
  | { name: 'faculty-reports' }
  | { name: 'faculty-announcements' }
  | { name: 'faculty-settings' }
  | { name: 'admin'; section: string }

type NavItem = { label: string; icon: ReactNode; view: View; match: string[] }

const nav: Record<Role, NavItem[]> = {
  student: [
    { label: 'Dashboard', icon: <LayoutDashboard />, view: { name: 'student-dashboard' }, match: ['student-dashboard'] },
    { label: 'Find Internships', icon: <Search />, view: { name: 'discover' }, match: ['discover', 'internship'] },
    { label: 'My Internships', icon: <Briefcase />, view: { name: 'my-internships' }, match: ['my-internships'] },
    { label: 'Learn from Seniors', icon: <BookOpenCheck />, view: { name: 'seniors' }, match: ['seniors', 'experience', 'share-experience'] },
    { label: 'My Profile', icon: <UserRound />, view: { name: 'profile' }, match: ['profile', 'onboarding'] },
    { label: 'Resume Analysis', icon: <FileSearch />, view: { name: 'resume-analysis' }, match: ['resume-analysis'] },
    { label: 'Skill Roadmap', icon: <Route />, view: { name: 'roadmap' }, match: ['roadmap'] },
    { label: 'Submit Self-Found', icon: <FilePlus2 />, view: { name: 'submit-internship' }, match: ['submit-internship'] },
    { label: 'Settings', icon: <Settings />, view: { name: 'settings' }, match: ['settings'] },
  ],
  faculty: [
    { label: 'Dashboard', icon: <LayoutDashboard />, view: { name: 'faculty-dashboard' }, match: ['faculty-dashboard'] },
    { label: 'Verification Center', icon: <ClipboardCheck />, view: { name: 'verification' }, match: ['verification'] },
    { label: 'Post Opportunity', icon: <Megaphone />, view: { name: 'post-opportunity' }, match: ['post-opportunity'] },
    { label: 'Manage Opportunities', icon: <Briefcase />, view: { name: 'faculty-opportunities' }, match: ['faculty-opportunities'] },
    { label: 'Students', icon: <GraduationCap />, view: { name: 'faculty-students' }, match: ['faculty-students', 'faculty-student'] },
    { label: 'Requests', icon: <Inbox />, view: { name: 'faculty-requests' }, match: ['faculty-requests'] },
    { label: 'Reports', icon: <BarChart3 />, view: { name: 'faculty-reports' }, match: ['faculty-reports'] },
    { label: 'Announcements', icon: <Send />, view: { name: 'faculty-announcements' }, match: ['faculty-announcements'] },
    { label: 'Settings', icon: <Settings />, view: { name: 'faculty-settings' }, match: ['faculty-settings'] },
  ],
  admin: [
    { label: 'Overview', icon: <LayoutDashboard />, view: { name: 'admin', section: 'overview' }, match: ['admin:overview'] },
    { label: 'Approvals', icon: <UserCheck />, view: { name: 'admin', section: 'approvals' }, match: ['admin:approvals'] },
    { label: 'Students', icon: <GraduationCap />, view: { name: 'admin', section: 'students' }, match: ['admin:students'] },
    { label: 'Faculty', icon: <Users />, view: { name: 'admin', section: 'faculty' }, match: ['admin:faculty'] },
    { label: 'Departments', icon: <Landmark />, view: { name: 'admin', section: 'departments' }, match: ['admin:departments'] },
    { label: 'Roles & Permissions', icon: <KeyRound />, view: { name: 'admin', section: 'roles' }, match: ['admin:roles'] },
    { label: 'Internships', icon: <Building2 />, view: { name: 'admin', section: 'internships' }, match: ['admin:internships'] },
    { label: 'Moderation', icon: <Flag />, view: { name: 'admin', section: 'moderation' }, match: ['admin:moderation'] },
    { label: 'Announcements', icon: <Megaphone />, view: { name: 'admin', section: 'announcements' }, match: ['admin:announcements'] },
    { label: 'Reports', icon: <BarChart3 />, view: { name: 'admin', section: 'reports' }, match: ['admin:reports'] },
    { label: 'Audit Logs', icon: <ScrollText />, view: { name: 'admin', section: 'audit' }, match: ['admin:audit'] },
    { label: 'Settings', icon: <Settings />, view: { name: 'admin', section: 'settings' }, match: ['admin:settings'] },
  ],
}

function viewKey(v: View) {
  return v.name === 'admin' ? `admin:${v.section}` : v.name
}

export function AppShell({ role, profile, view, onNavigate, onBack, canGoBack, onLogout, children }: { role: Role; profile: { id: string; full_name: string; email: string }; view: View; onNavigate: (v: View) => void; onBack: () => void; canGoBack: boolean; onLogout: () => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const name = profile.full_name || profile.email
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
  const key = viewKey(view)

  useEffect(() => {
    setHasUnreadNotifications(false)
  }, [profile.id])

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-sidebar-primary">InternHub</p>
          <p className="text-xs leading-snug text-sidebar-foreground/75">{COLLEGE.name}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <ul className="flex flex-col gap-0.5">
          {nav[role].map((item) => {
            const active = item.match.includes(key)
            return (
              <li key={item.label}>
                <button
                  onClick={() => {
                    onNavigate(item.view)
                    setMobileOpen(false)
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors [&_svg]:size-4',
                    active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 p-3 text-xs">
          <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
          <span className="text-sidebar-foreground/85">Faculty-verified internship records</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-72 animate-in slide-in-from-left duration-200">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          {canGoBack && (
            <button onClick={onBack} className="rounded-md border bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Go back to previous page">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{COLLEGE.name}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {role === 'student' ? 'Student Portal' : role === 'faculty' ? 'Faculty Portal' : 'Admin Portal'} · {COLLEGE.location}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications, 0 unread"
              aria-expanded={notifOpen}
            >
              <Bell className="size-5" />
              {hasUnreadNotifications && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-popover p-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button onClick={() => setNotifOpen(false)} aria-label="Close notifications" className="rounded p-1 hover:bg-muted">
                    <X className="size-3.5" />
                  </button>
                </div>
                <ul className="flex flex-col">
                  <li className="rounded-lg px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l pl-3">
            <button
              onClick={() => (role === 'student' ? onNavigate({ name: 'profile' }) : role === 'faculty' && onNavigate({ name: 'faculty-settings' }))}
              disabled={role === 'admin'}
              aria-label={role === 'student' ? 'Open my profile' : role === 'faculty' ? 'Open profile settings' : undefined}
              className="flex items-center gap-3 rounded-lg text-left enabled:hover:opacity-85"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">
                {initials}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className="block truncate text-sm font-medium leading-tight">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
              </span>
            </button>
            <button onClick={onLogout} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={key} className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>

        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          {'© 2026 '}
          {COLLEGE.name}
          {' · Training & Placement Cell · InternHub'}
        </footer>
      </div>
    </div>
  )
}
