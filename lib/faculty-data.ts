import type { AppStatus, Mode, VerifyStatus } from '@/lib/data'

export const TODAY = new Date().toISOString().slice(0, 10)
export const facultyAccount = {
  name: '',
  employeeId: '',
  dept: '',
  designation: '',
  email: '',
  phone: '',
}

export const sections: string[] = []
export const sectionSizes: Record<string, number> = {}

export type InternshipStatus = 'Not started' | 'Applied' | 'Ongoing' | 'Completed'
export type StudentVerification = VerifyStatus | 'No submissions'
export type DeptStudent = {
  id: string
  name: string
  regNo: string
  branch: string
  year: number
  section: string
  cgpa: number
  readiness: number
  status: InternshipStatus
  verification: StudentVerification
  skills: string[]
  email: string
  phone: string
  applications: { company: string; role: string; status: AppStatus; date: string }[]
  internships: { company: string; role: string; period: string; status: 'Ongoing' | 'Completed' }[]
  documents: { name: string; type: string; status: VerifyStatus; date: string }[]
  timeline: { date: string; event: string; by: string; status?: VerifyStatus }[]
}
export const deptStudents: DeptStudent[] = []

export type AuditEntry = { action: string; by: string; date: string; note?: string; status?: VerifyStatus }
export type VerificationItem = {
  id: string
  type: 'Offer Letter' | 'Certificate' | 'Self-Found' | 'Experience'
  student: string
  regNo: string
  branch: string
  section: string
  company: string
  role: string
  submitted: string
  status: VerifyStatus
  file: string
  decidedBy?: string
  decidedOn?: string
  note?: string
  audit: AuditEntry[]
}
export const verificationItems: VerificationItem[] = []

export function workingDaysSince(from: string) {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${TODAY}T00:00:00`)
  let days = 0
  while (start < end) {
    start.setDate(start.getDate() + 1)
    if (start.getDay() !== 0 && start.getDay() !== 6) days += 1
  }
  return days
}

export const SLA_DAYS = 3
export type OppStatus = 'Draft' | 'Active' | 'Closed'
export type Opportunity = {
  id: string
  company: string
  role: string
  duration: string
  mode: Mode
  stipend: string
  deadline: string
  skills: string
  description: string
  link: string
  branches: string[]
  years: number[]
  minCgpa: number
  status: OppStatus
  eligible: number
  interested: string[]
  postedOn: string
}
export const opportunitiesSeed: Opportunity[] = []

export type RequestType = 'Permission / NOC letter' | 'Completion certificate letter' | 'Re-verification request' | 'Query to faculty'
export type RequestStatus = 'New' | 'In progress' | 'Resolved'
export type StudentRequest = {
  id: string
  studentId: string
  student: string
  regNo: string
  section: string
  type: RequestType
  date: string
  status: RequestStatus
  subject: string
  message: string
  decision?: 'Approved' | 'Rejected'
  reason?: string
  thread: { by: string; text: string; date: string; faculty?: boolean }[]
}
export const requestsSeed: StudentRequest[] = []

export type Announcement = { id: string; title: string; body: string; audience: string; deadline?: string; sentOn: string; delivered: number; read: number }
export const announcementsSeed: Announcement[] = []
export const sectionReport: { section: string; students: number; participated: number; verified: number; pending: number }[] = []
export const domainReport: { label: string; value: number }[] = []
export const companyReport: { label: string; value: number }[] = []
export const stipendReport: { label: string; value: number }[] = []
