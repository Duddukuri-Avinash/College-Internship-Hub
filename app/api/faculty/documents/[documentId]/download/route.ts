import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'
import { readUpload } from '@/lib/server/uploads'

type DocumentRow = {
  file_name: string
  storage_key: string | null
  mime_type: string | null
}

export async function GET(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null) throw new ApiError('Faculty access required.', 403)
    if (user.department_id === null || !user.department_code) {
      throw new ApiError('Faculty department was not found.', 404)
    }
    const { documentId: rawId } = await context.params
    const documentId = Number(rawId)
    if (!Number.isSafeInteger(documentId) || documentId < 1) throw new ApiError('Document not found.', 404)
    const pool = await getPool()
    const result = await pool
      .request()
      .input('documentId', sql.Int, documentId)
      .input('departmentId', sql.Int, user.department_id)
      .input('departmentCode', sql.VarChar(20), user.department_code)
      .query<DocumentRow>(`
        SELECT d.file_name, d.storage_key, d.mime_type
        FROM documents d
        INNER JOIN students s ON s.id = d.student_id
        WHERE d.id = @documentId AND d.document_type <> 'resume'
          AND (s.department_id = @departmentId OR s.branch = @departmentCode)
      `)
    const document = result.recordset[0]
    if (!document?.storage_key) throw new ApiError('Document not found.', 404)
    const contents = await readUpload(document.storage_key)
    if (!contents) throw new ApiError('Document file is not available.', 404)
    return new NextResponse(contents, {
      headers: {
        'content-type': document.mime_type ?? 'application/octet-stream',
        'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(document.file_name)}`,
      },
    })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty document download failed')
  }
}
