'use client'

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  academicYearsSeed,
  announcementsSeed,
  approvalsSeed,
  auditSeed,
  branchesSeed,
  companiesSeed,
  facultySeed,
  listingsSeed,
  moderationSeed,
  roadmapsSeed,
  rolesSeed,
  scheduledReportsSeed,
  sectionsSeed,
  studentsSeed,
  templatesSeed,
  ticketsSeed,
  type AcademicYear,
  type AdminAnnouncement,
  type AdminFaculty,
  type AdminStudent,
  type AuditCategory,
  type AuditEntry,
  type Branch,
  type Company,
  type FacultyApproval,
  type Listing,
  type ModItem,
  type Roadmap,
  type RoleDef,
  type ScheduledReport,
  type Section,
  type TemplateKey,
  type Ticket,
} from '@/lib/admin-data'

type Set<T> = Dispatch<SetStateAction<T>>

export type PlatformSettings = {
  institution: string
  academicYear: string
  sla: number
  maxFile: number
  reminderDays: number
  escalateDays: number
  fileTypes: string[]
  retentionYears: number
  hideCgpa: boolean
  anonymousExperiences: boolean
  aiResume: boolean
  aiRoadmap: boolean
  aiRecommendations: boolean
}

type Store = {
  students: AdminStudent[]
  setStudents: Set<AdminStudent[]>
  faculty: AdminFaculty[]
  setFaculty: Set<AdminFaculty[]>
  approvals: FacultyApproval[]
  setApprovals: Set<FacultyApproval[]>
  branches: Branch[]
  setBranches: Set<Branch[]>
  sections: Section[]
  setSections: Set<Section[]>
  years: AcademicYear[]
  setYears: Set<AcademicYear[]>
  eligibility: { minCgpa: number; years: number[] }
  setEligibility: Set<{ minCgpa: number; years: number[] }>
  roles: RoleDef[]
  setRoles: Set<RoleDef[]>
  listings: Listing[]
  setListings: Set<Listing[]>
  companies: Company[]
  setCompanies: Set<Company[]>
  moderation: ModItem[]
  setModeration: Set<ModItem[]>
  announcements: AdminAnnouncement[]
  setAnnouncements: Set<AdminAnnouncement[]>
  audit: AuditEntry[]
  log: (action: string, category: AuditCategory, target: string, before?: Record<string, string>, after?: Record<string, string>) => void
  roadmaps: Roadmap[]
  setRoadmaps: Set<Roadmap[]>
  templates: typeof templatesSeed
  setTemplates: Set<typeof templatesSeed>
  tickets: Ticket[]
  setTickets: Set<Ticket[]>
  scheduled: ScheduledReport[]
  setScheduled: Set<ScheduledReport[]>
  settings: PlatformSettings
  setSettings: Set<PlatformSettings>
}

export type { TemplateKey }

const Ctx = createContext<Store | null>(null)

function nowStamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function AdminStoreProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [students, setStudents] = useState(studentsSeed)
  const [faculty, setFaculty] = useState(facultySeed)
  const [approvals, setApprovals] = useState(approvalsSeed)
  const [branches, setBranches] = useState(branchesSeed)
  const [sections, setSections] = useState(sectionsSeed)
  const [years, setYears] = useState(academicYearsSeed)
  const [eligibility, setEligibility] = useState({ minCgpa: 6.5, years: [3, 4] })
  const [roles, setRoles] = useState(rolesSeed)
  const [listings, setListings] = useState(listingsSeed)
  const [companies, setCompanies] = useState(companiesSeed)
  const [moderation, setModeration] = useState(moderationSeed)
  const [announcements, setAnnouncements] = useState(announcementsSeed)
  const [audit, setAudit] = useState(auditSeed)
  const [roadmaps, setRoadmaps] = useState(roadmapsSeed)
  const [templates, setTemplates] = useState(templatesSeed)
  const [tickets, setTickets] = useState(ticketsSeed)
  const [scheduled, setScheduled] = useState(scheduledReportsSeed)
  const [settings, setSettings] = useState<PlatformSettings>({
    institution: 'R.V.R & J.C College of Engineering',
    academicYear: '',
    sla: 3,
    maxFile: 5,
    reminderDays: 2,
    escalateDays: 5,
    fileTypes: ['PDF', 'JPG', 'PNG'],
    retentionYears: 5,
    hideCgpa: true,
    anonymousExperiences: true,
    aiResume: true,
    aiRoadmap: true,
    aiRecommendations: true,
  })

  useEffect(() => {
    if (!enabled) return
    let active = true
    void fetch('/api/admin/data')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Could not load admin data.')
        return result as {
          students: AdminStudent[]
          faculty: AdminFaculty[]
          approvals: FacultyApproval[]
        }
      })
      .then((result) => {
        if (!active) return
        setStudents(result.students)
        setFaculty(result.faculty)
        setApprovals(result.approvals)
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Could not load admin data.')
      })
    return () => {
      active = false
    }
  }, [enabled])

  const log: Store['log'] = (action, category, target, before, after) =>
    setAudit((a) => [{ id: `l${Date.now()}${Math.random().toString(36).slice(2, 5)}`, actor: 'Admin session', action, category, target, time: nowStamp(), before, after }, ...a])

  return (
    <Ctx.Provider
      value={{
        students, setStudents, faculty, setFaculty, approvals, setApprovals, branches, setBranches, sections, setSections, years, setYears,
        eligibility, setEligibility, roles, setRoles, listings, setListings, companies, setCompanies, moderation, setModeration,
        announcements, setAnnouncements, audit, log, roadmaps, setRoadmaps, templates, setTemplates, tickets, setTickets,
        scheduled, setScheduled, settings, setSettings,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAdmin() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useAdmin must be used inside AdminStoreProvider')
  return s
}
