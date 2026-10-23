import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

type FacultyRow = {
  id: number
  first_name: string
  last_name: string
  employee_id: string
  department_code: string | null
  designation: string
  email: string
  is_active: boolean
  user_active: boolean
  is_verified: boolean
  created_at: Date
}

type StudentRow = {
  id: number
  first_name: string
  last_name: string
  roll_number: string
  branch: string
  department_code: string | null
  year: number
  section: string | null
  email: string
  phone: string | null
  cgpa: number | null
  profile_completion: number
  resume_file_name: string | null
  user_active: boolean
  student_active: boolean
}

type ApplicationRow = {
  student_id: number
  status: string
}

type DocumentRow = {
  student_id: number
  title: string
  file_name: string
  document_type: string
  status: string
  created_at: Date
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
    if (user.role !== 'admin') throw new ApiError('Administrator access required.', 403)

    const pool = await getPool()
    const [facultyResult, studentsResult, applicationsResult, documentsResult] = await Promise.all([
      pool.request().query<FacultyRow>(`
        SELECT f.id, u.first_name, u.last_name, f.employee_id, d.code AS department_code,
               f.designation, u.email, f.is_active, u.is_active AS user_active,
               f.is_verified, f.created_at
        FROM faculty f
        INNER JOIN users u ON u.id = f.user_id
        LEFT JOIN departments d ON d.id = f.department_id
        ORDER BY f.created_at DESC
      `),
      pool.request().query<StudentRow>(`
        SELECT s.id, u.first_name, u.last_name, s.roll_number, s.branch, d.code AS department_code,
               s.year, s.section, u.email, s.phone, s.cgpa, s.profile_completion,
               s.resume_file_name, s.is_active AS student_active, u.is_active AS user_active
        FROM students s
        INNER JOIN users u ON u.id = s.user_id
        LEFT JOIN departments d ON d.id = s.department_id
        ORDER BY s.created_at DESC
      `),
      pool.request().query<ApplicationRow>(`
        SELECT student_id, status FROM internship_applications
      `),
      pool.request().query<DocumentRow>(`
        SELECT student_id, title, file_name, document_type, status, created_at
        FROM documents
        WHERE student_id IS NOT NULL
        ORDER BY created_at DESC
      `),
    ])

    const applications = new Map<number, string[]>()
    for (const row of applicationsResult.recordset) {
      applications.set(row.student_id, [...(applications.get(row.student_id) ?? []), row.status])
    }
    const documents = new Map<number, DocumentRow[]>()
    for (const row of documentsResult.recordset) {
      documents.set(row.student_id, [...(documents.get(row.student_id) ?? []), row])
    }

    const faculty = facultyResult.recordset.map((row) => ({
      id: String(row.id),
      name: `${row.first_name} ${row.last_name}`.trim(),
      empId: row.employee_id,
      dept: row.department_code ?? 'Unassigned',
      designation: row.designation,
      email: row.email,
      roles: ['Faculty Mentor'],
      groups: [],
      status: row.is_active && row.user_active ? 'Active' : 'Inactive',
      verified: 0,
      turnaround: 0,
      pending: { verifications: 0, requests: 0, reviews: 0 },
    }))
    const approvals = facultyResult.recordset.map((row) => ({
      id: String(row.id),
      name: `${row.first_name} ${row.last_name}`.trim(),
      empId: row.employee_id,
      dept: row.department_code ?? 'Unassigned',
      designation: row.designation,
      email: row.email,
      date: new Date(row.created_at).toISOString(),
      status: row.is_verified ? 'Approved' : 'Pending',
    }))
    const students = studentsResult.recordset.map((row) => {
      const studentApplications = applications.get(row.id) ?? []
      const studentDocuments = documents.get(row.id) ?? []
      return {
        id: String(row.id),
        name: `${row.first_name} ${row.last_name}`.trim(),
        roll: row.roll_number,
        branch: row.branch || row.department_code || '',
        year: row.year,
        section: row.section ?? '',
        email: row.email,
        phone: row.phone ?? '',
        cgpa: row.cgpa ?? 0,
        status: row.student_active && row.user_active ? 'Active' : 'Inactive',
        internship: studentApplications.includes('Completed')
          ? 'Completed'
          : studentApplications.includes('Selected')
            ? 'Interning'
            : studentApplications.includes('Applied')
              ? 'Applied'
              : 'None',
        internships: studentApplications.filter((status) => ['Selected', 'Completed'].includes(status)).length,
        profile: row.profile_completion,
        resume: row.resume_file_name || studentDocuments.some((doc) => doc.document_type === 'resume') ? 100 : 0,
        docs: studentDocuments.map((doc) => ({
          name: doc.title || doc.file_name,
          status: verificationStatus(doc.status),
        })),
        activity: studentDocuments.map((doc) => ({
          time: new Date(doc.created_at).toISOString(),
          text: `Uploaded ${doc.title || doc.file_name}`,
        })),
      }
    })

    return NextResponse.json({ faculty, approvals, students })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js admin data request failed')
  }
}
