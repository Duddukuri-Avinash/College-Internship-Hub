import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'

const updateSchema = z.object({
  decision: z.enum(['verified', 'rejected', 'additional_proof_required']),
  notes: z.string().max(2000).optional().default(''),
})

type DocumentOwnerRow = {
  id: number
  student_id: number
}

function verificationStatus(value: string) {
  return ({
    verified: 'Verified',
    rejected: 'Rejected',
    additional_proof_required: 'Additional Proof Required',
  } as Record<string, string>)[value]
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null) throw new ApiError('Faculty access required.', 403)
    if (user.department_id === null || !user.department_code) {
      throw new ApiError('Faculty department was not found.', 404)
    }
    const { documentId: rawId } = await context.params
    const documentId = Number(rawId)
    if (!Number.isSafeInteger(documentId) || documentId < 1) throw new ApiError('Document not found.', 404)
    const input = updateSchema.parse(await readJson(request))
    const pool = await getPool()
    const documentResult = await pool
      .request()
      .input('documentId', sql.Int, documentId)
      .input('departmentId', sql.Int, user.department_id)
      .input('departmentCode', sql.VarChar(20), user.department_code)
      .query<DocumentOwnerRow>(`
        SELECT d.id, d.student_id
        FROM documents d
        INNER JOIN students s ON s.id = d.student_id
        WHERE d.id = @documentId AND d.document_type <> 'resume'
          AND (s.department_id = @departmentId OR s.branch = @departmentCode)
      `)
    const document = documentResult.recordset[0]
    if (!document) throw new ApiError('Document not found.', 404)

    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    try {
      await transaction
        .request()
        .input('documentId', sql.Int, document.id)
        .input('decision', sql.VarChar(40), input.decision)
        .query('UPDATE documents SET status = @decision WHERE id = @documentId')
      await transaction
        .request()
        .input('studentId', sql.Int, document.student_id)
        .input('documentId', sql.Int, document.id)
        .input('reviewerId', sql.Int, user.faculty_id)
        .input('decision', sql.VarChar(40), input.decision)
        .input('notes', sql.NVarChar(sql.MAX), input.notes.trim() || null)
        .input('verifiedAt', sql.DateTime, input.decision === 'verified' ? new Date() : null)
        .query(`
          INSERT INTO verifications (student_id, document_id, reviewer_id, decision, notes, verified_at, created_at)
          VALUES (@studentId, @documentId, @reviewerId, @decision, @notes, @verifiedAt, GETUTCDATE())
        `)
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    return NextResponse.json({ status: verificationStatus(input.decision) })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid verification decision.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js faculty verification update failed')
  }
}
