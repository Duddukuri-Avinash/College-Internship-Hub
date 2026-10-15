import { branches as collegeBranches, branchName } from '@/lib/branches'
import type { VerifyStatus } from '@/lib/data'

export const ADMIN_TODAY = new Date().toISOString().slice(0, 10)
export const COLLEGE_DOMAIN = '@rvrjc.ac.in'
export const BRANCHES = collegeBranches.map(({ code }) => code)
export const SECTIONS = ['A', 'B', 'C'] as const
export const YEARS = [1, 2, 3, 4] as const

export type StudentStatus = 'Active' | 'Inactive'
export type InternshipState = 'Interning' | 'Completed' | 'Applied' | 'None'
export type AdminStudent = {
  id: string; name: string; roll: string; branch: string; year: number; section: string
  email: string; phone: string; cgpa: number; status: StudentStatus; internship: InternshipState
  internships: number; profile: number; resume: number
  docs: { name: string; status: VerifyStatus }[]
  activity: { time: string; text: string }[]
}
export const studentsSeed: AdminStudent[] = []

export type FacultyRole = 'Internship Coordinator' | 'Faculty Mentor' | 'Reviewer'
export const FACULTY_ROLES: FacultyRole[] = ['Internship Coordinator', 'Faculty Mentor', 'Reviewer']
export type AdminFaculty = {
  id: string; name: string; empId: string; dept: string; designation: string; email: string
  roles: FacultyRole[]; groups: string[]; status: StudentStatus; verified: number; turnaround: number
  pending: { verifications: number; requests: number; reviews: number }
}
export const facultySeed: AdminFaculty[] = []

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Correction requested'
export type FacultyApproval = {
  id: string; name: string; empId: string; dept: string; designation: string
  email: string; date: string; status: ApprovalStatus; note?: string
}
export const approvalsSeed: FacultyApproval[] = []

export type Branch = { code: string; name: string; students: number; archived: boolean }
export type Section = { id: string; branch: string; year: number; name: string; archived: boolean }
export type AcademicYear = { id: string; label: string; current: boolean; archived: boolean }
export const branchesSeed: Branch[] = collegeBranches.map(({ code }) => ({
  code, name: branchName(code), students: 0, archived: false,
}))
export const sectionsSeed: Section[] = []
export const academicYearsSeed: AcademicYear[] = []

export const PERMISSIONS = [
  { key: 'verify', label: 'Verify documents' },
  { key: 'post', label: 'Post opportunities' },
  { key: 'announce', label: 'Send announcements' },
  { key: 'export', label: 'Export reports' },
  { key: 'manage', label: 'Manage users' },
] as const
export type PermKey = (typeof PERMISSIONS)[number]['key']
export type RoleDef = { id: string; name: string; users: number; locked?: boolean; perms: Record<PermKey, boolean> }
export const rolesSeed: RoleDef[] = []

export type ListingSource = 'College' | 'Self-Found' | 'Referral'
export type ListingStatus = 'Open' | 'Closed'
export type Listing = { id: string; role: string; company: string; source: ListingSource; branches: string[]; deadline: string; status: ListingStatus; applicants: number }
export const listingsSeed: Listing[] = []
export type CompanyLabel = 'Trusted' | 'Neutral' | 'Blocked'
export type Company = { name: string; label: CompanyLabel; note: string }
export const companiesSeed: Company[] = []

export type ModState = 'Reported' | 'Pending review' | 'Resolved'
export type ModDecision = 'Approved' | 'Removed' | 'Author warned' | 'Sharing suspended'
export type ModItem = {
  id: string; kind: 'Experience' | 'Referral' | 'Comment'; title: string; content: string; author: string
  authorHistory: { posts: number; warnings: number; removed: number }; reason: string; reporter?: string
  date: string; state: ModState; decision?: ModDecision; note?: string
}
export const moderationSeed: ModItem[] = []

export type AnnouncementStatus = 'Sent' | 'Scheduled' | 'Draft'
export type AdminAnnouncement = {
  id: string; title: string; body: string; link?: string; audience: string; recipients: number
  status: AnnouncementStatus; date: string; delivered?: number; opened?: number
}
export const announcementsSeed: AdminAnnouncement[] = []

export type AuditCategory = 'Verification' | 'Opportunity' | 'Settings' | 'Moderation' | 'User management' | 'Announcement'
export type AuditEntry = {
  id: string; actor: string; action: string; category: AuditCategory; target: string; time: string
  before?: Record<string, string>; after?: Record<string, string>
}
export const auditSeed: AuditEntry[] = []

export type Roadmap = { id: string; role: string; skills: string[]; published: boolean }
export const roadmapsSeed: Roadmap[] = []

export type TemplateKey = 'approved' | 'rejected' | 'moreinfo' | 'deadline'
export const templatesSeed: Record<TemplateKey, { label: string; subject: string; body: string }> = {
  approved: { label: 'Verification approved', subject: '', body: '' },
  rejected: { label: 'Verification rejected', subject: '', body: '' },
  moreinfo: { label: 'More information needed', subject: '', body: '' },
  deadline: { label: 'Deadline reminder', subject: '', body: '' },
}
export const templateSample: Record<string, string> = {
  name: '{name}', document: '{document}', faculty: '{faculty}', company: '{company}',
  reason: '{reason}', college: '{college}', days: '{days}', role: '{role}', deadline: '{deadline}',
}

export type TicketStatus = 'Open' | 'In progress' | 'Closed'
export type Ticket = { id: string; from: string; role: 'Student' | 'Faculty'; subject: string; body: string; date: string; status: TicketStatus }
export const ticketsSeed: Ticket[] = []
export type ScheduledReport = { id: string; name: string; frequency: 'Weekly' | 'Monthly'; recipients: string; active: boolean }
export const scheduledReportsSeed: ScheduledReport[] = []
export const facultyPerBranch: Record<string, number> = {}
export const branchStudents: Record<string, number> = Object.fromEntries(branchesSeed.map((branch) => [branch.code, branch.students]))
