import { branchCodes } from '@/lib/branches'

export const COLLEGE = {
  name: 'R.V.R & J.C College of Engineering',
  short: 'RVR&JC',
  location: 'Chowdavaram, Guntur, Andhra Pradesh',
}

export type Source = 'College Opportunity' | 'Self-Found' | 'Senior Referral'
export type Mode = 'Remote' | 'On-site' | 'Hybrid'

export type Internship = {
  id: string
  company: string
  role: string
  skills: string[]
  duration: string
  mode: Mode
  location: string
  stipend: number
  deadline: string
  source: Source
  branches: string[]
  years: number[]
  minCgpa: number
  match: number
  description: string
  matchReasons: string[]
  missingSkills: string[]
  link: string
}

export const internships: Internship[] = []

export type AppStatus = 'Saved' | 'Applied' | 'Interview' | 'Selected' | 'Rejected' | 'Withdrawn'
export const applications: { id: string; internshipId: string; status: AppStatus; updated: string; note: string }[] = []

export type VerifyStatus = 'Pending' | 'Verified' | 'Rejected' | 'Additional Proof Required'
export const lifecycleStages = [
  'Offer Received',
  'Offer Uploaded',
  'Verified',
  'In Progress',
  'Completed',
  'Certificate Verified',
] as const
export const myInternships: {
  id: string
  company: string
  role: string
  period: string
  stage: number
  offerStatus: VerifyStatus
  certificateStatus: VerifyStatus | null
  facultyNote: string
  mentor: string
}[] = []
export const experiences: {
  id: string
  name: string
  batch: string
  company: string
  role: string
  duration: string
  skills: string[]
  obtained: Source
  project: string
  learned: string
  interview: string
  challenges: string
  tech: string[]
  recommendation: string
  rating: number
}[] = []
export const student = {
  name: '',
  initials: '',
  regNo: '',
  branch: '',
  year: 0,
  cgpa: 0,
  profileCompletion: 0,
  readiness: 0,
  semester: 0,
  section: '',
  batch: '',
  degree: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  mentor: '',
  linkedin: '',
  github: '',
  resume: '',
  resumeUpdated: '',
  about: '',
  skills: [] as { name: string; level: number }[],
  semesters: [] as { sem: number; sgpa: number }[],
  education: [] as { level: string; institution: string; period: string; score: string }[],
  projects: [] as { title: string; tech: string[]; summary: string }[],
  certifications: [] as { name: string; issuer: string; year: string }[],
  achievements: [] as string[],
}

export const faculty = {
  name: '',
  initials: '',
  dept: '',
  designation: '',
}

export const verificationQueue: {
  id: string
  documentId?: string
  type: string
  student: string
  regNo: string
  branch: string
  company: string
  role: string
  submitted: string
  status: VerifyStatus
  file: string
}[] = []
export const branches: string[] = branchCodes
export const branchStats: { branch: string; students: number; interning: number }[] = []
export const skillGaps: { skill: string; demand: number; supply: number }[] = []
export const auditLogs: { id: string; actor: string; action: string; target: string; time: string }[] = []

export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
