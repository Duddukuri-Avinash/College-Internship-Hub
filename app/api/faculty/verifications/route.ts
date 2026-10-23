import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

type VerificationDocument = {
  id: number
  document_type: string
  first_name: string
  last_name: string
  roll_number: string
  branch: string
  title: string
  file_name: string
  created_at: Date
  status: string
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

function verificationType(value: string) {
  return ({
    offer_letter: 'Offer Letter',
    certificate: 'Certificate',
    other: 'Self-Found',
  } as Record<string, string>)[value.trim().toLowerCase()] ?? 'Experience'
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null) throw new ApiError('Faculty access required.', 403)
    if (user.department_id === null || !user.department_code) return NextResponse.json({ verifications: [] })

    const pool = await getPool()
    const result = await pool
      .request()
      .input('departmentId', sql.Int, user.department_id)
      .input('departmentCode', sql.VarChar(20), user.department_code)
      .query<VerificationDocument>(`
        SELECT d.id, d.document_type, u.first_name, u.last_name, s.roll_number, s.branch,
               d.title, d.file_name, d.created_at, d.status
        FROM documents d
        INNER JOIN students s ON s.id = d.student_id
        INNER JOIN users u ON u.id = s.user_id
        WHERE d.document_type IN ('offer_letter', 'certificate', 'other')
          AND (s.department_id = @departmentId OR s.branch = @departmentCode)
        ORDER BY d.created_at DESC
      `)
    return NextResponse.json({
      verifications: result.recordset.map((document) => ({
        id: String(document.id),
        documentId: String(document.id),
        type: verificationType(document.document_type),
        student: `${document.first_name} ${document.last_name}`.trim(),
        regNo: document.roll_number,
        branch: document.branch,
        company: document.title || document.file_name,
        role: document.document_type.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        submitted: new Date(document.created_at).toISOString().slice(0, 10),
        status: verificationStatus(document.status),
        file: document.file_name,
      })),
    })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty verifications request failed')
  }
}
