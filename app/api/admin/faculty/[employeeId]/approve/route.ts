import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'
import { notify } from '@/lib/server/notifications'

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
      .query<{ user_id: number }>('UPDATE faculty SET is_verified = 1 OUTPUT INSERTED.user_id WHERE employee_id = @employeeId')
    if (!result.rowsAffected[0]) throw new ApiError('Faculty registration not found.', 404)
    await notify({
      userId: result.recordset[0].user_id,
      type: 'account',
      category: 'account',
      title: 'Faculty account approved',
      message: 'Your faculty account has been approved. You can now access faculty features.',
      link: '/notifications',
      dedupeKey: `faculty-approved:${employeeId}`,
      sendEmail: true,
    })
    return NextResponse.json({ status: 'approved' })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty approval failed')
  }
}
