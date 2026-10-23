import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

export async function POST(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'admin') throw new ApiError('Administrator access required.', 403)

    const { employeeId: rawEmployeeId } = await context.params
    const employeeId = rawEmployeeId.trim().toUpperCase()
    const pool = await getPool()
    const result = await pool
      .request()
      .input('employeeId', sql.VarChar(50), employeeId)
      .query('UPDATE faculty SET is_verified = 1 WHERE employee_id = @employeeId')
    if (!result.rowsAffected[0]) throw new ApiError('Faculty registration not found.', 404)
    return NextResponse.json({ status: 'approved' })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty approval failed')
  }
}
