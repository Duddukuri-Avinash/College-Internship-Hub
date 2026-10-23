import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

type StudentRow = {
  id: number
  first_name: string
  last_name: string
  roll_number: string
  branch: string
  year: number
  section: string | null
  cgpa: number | null
  readiness_score: number
  email: string
  phone: string | null
  skills: string | string[] | null
}

type ApplicationRow = {
  student_id: number
  company: string
  role: string
  duration: string
  status: string
  created_at: Date
}

type DocumentRow = {
  student_id: number
  title: string
  file_name: string
  document_type: string
  status: string
  created_at: Date
}

type VerificationRow = {
  student_id: number
  skill: string | null
  decision: string
  created_at: Date
}

function jsonArray(value: string | string[] | null): string[] {
  if (Array.isArray(value)) return value
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed)) throw new Error('Stored student skills are invalid.')
  return parsed.filter((item): item is string => typeof item === 'string')
}

function verificationStatus(value: string) {
  return ({
    pending: 'Pending',
    verified: 'Verified',
    approved: 'Verified',
    rejected: 'Rejected',
    additional_proof_required: 'Additional Proof Required',
  } as Record<string, string>)[value] ?? 'Pending'
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null) throw new ApiError('Faculty access required.', 403)
    if (user.department_id === null || !user.department_code) return NextResponse.json({ students: [] })

    const pool = await getPool()
    const params = () => pool.request()
      .input('departmentId', sql.Int, user.department_id)
      .input('departmentCode', sql.VarChar(20), user.department_code)
    const [studentsResult, applicationsResult, documentsResult, verificationsResult] = await Promise.all([
      params().query<StudentRow>(`
        SELECT s.id, u.first_name, u.last_name, s.roll_number, s.branch, s.year, s.section,
               s.cgpa, s.readiness_score, u.email, s.phone, s.skills
        FROM students s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.department_id = @departmentId OR s.branch = @departmentCode
        ORDER BY s.created_at DESC
      `),
      params().query<ApplicationRow>(`
        SELECT s.id AS student_id, i.company, i.role, i.duration, a.status, a.created_at
        FROM internship_applications a
        INNER JOIN students s ON s.id = a.student_id
        INNER JOIN internships i ON i.id = a.internship_id
        WHERE s.department_id = @departmentId OR s.branch = @departmentCode
      `),
      params().query<DocumentRow>(`
        SELECT d.student_id, d.title, d.file_name, d.document_type, d.status, d.created_at
        FROM documents d
        INNER JOIN students s ON s.id = d.student_id
        WHERE s.department_id = @departmentId OR s.branch = @departmentCode
      `),
      params().query<VerificationRow>(`
        SELECT v.student_id, v.skill, v.decision, v.created_at
        FROM verifications v
        INNER JOIN students s ON s.id = v.student_id
        WHERE s.department_id = @departmentId OR s.branch = @departmentCode
        ORDER BY v.created_at DESC
      `),
    ])

    const applications = new Map<number, ApplicationRow[]>()
    for (const item of applicationsResult.recordset) {
      applications.set(item.student_id, [...(applications.get(item.student_id) ?? []), item])
    }
    const documents = new Map<number, DocumentRow[]>()
    for (const item of documentsResult.recordset) {
      documents.set(item.student_id, [...(documents.get(item.student_id) ?? []), item])
    }
    const verifications = new Map<number, VerificationRow[]>()
    for (const item of verificationsResult.recordset) {
      verifications.set(item.student_id, [...(verifications.get(item.student_id) ?? []), item])
    }

    return NextResponse.json({
      students: studentsResult.recordset.map((student) => {
        const studentApplications = applications.get(student.id) ?? []
        const studentDocuments = documents.get(student.id) ?? []
        const studentVerifications = verifications.get(student.id) ?? []
        return {
          id: String(student.id),
          name: `${student.first_name} ${student.last_name}`.trim(),
          regNo: student.roll_number,
          branch: student.branch,
          year: student.year,
          section: student.section ?? 'A',
          cgpa: student.cgpa ?? 0,
          readiness: student.readiness_score,
          status: studentApplications.some((item) => item.status === 'Completed')
            ? 'Completed'
            : studentApplications.some((item) => item.status === 'Selected')
              ? 'Ongoing'
              : studentApplications.some((item) => item.status === 'Applied')
                ? 'Applied'
                : 'Not started',
          verification: studentVerifications.length
            ? verificationStatus(studentVerifications[0].decision)
            : 'No submissions',
          skills: jsonArray(student.skills),
          email: student.email,
          phone: student.phone ?? '',
          applications: studentApplications.map((item) => ({
            company: item.company,
            role: item.role,
            status: item.status,
            date: new Date(item.created_at).toISOString().slice(0, 10),
          })),
          internships: studentApplications
            .filter((item) => ['Selected', 'Completed'].includes(item.status))
            .map((item) => ({
              company: item.company,
              role: item.role,
              period: item.duration,
              status: item.status === 'Completed' ? 'Completed' : 'Ongoing',
            })),
          documents: studentDocuments
            .filter((item) => item.document_type.toLowerCase() !== 'resume')
            .map((item) => ({
              name: item.title || item.file_name,
              type: item.document_type,
              status: verificationStatus(item.status),
              date: new Date(item.created_at).toISOString().slice(0, 10),
            })),
          timeline: studentVerifications.map((item) => ({
            date: new Date(item.created_at).toISOString().slice(0, 10),
            event: item.skill ? `${item.skill} verification` : 'Document verification',
            by: 'Faculty review',
            status: verificationStatus(item.decision),
          })),
        }
      }),
    })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty student request failed')
  }
}
