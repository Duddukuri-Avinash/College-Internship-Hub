import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

type FacultyProfileRow = {
  employee_id: string
  designation: string
  department_code: string | null
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null) throw new ApiError('Faculty access required.', 403)

    const pool = await getPool()
    const result = await pool
      .request()
      .input('userId', sql.Int, user.id)
      .query<FacultyProfileRow>(`
        SELECT f.employee_id, f.designation, d.code AS department_code
        FROM faculty f
        LEFT JOIN departments d ON d.id = f.department_id
        WHERE f.user_id = @userId
      `)
    const faculty = result.recordset[0]
    if (!faculty) throw new ApiError('Faculty profile was not found.', 404)
    return NextResponse.json({
      name: `${user.first_name} ${user.last_name}`.trim(),
      employeeId: faculty.employee_id,
      dept: faculty.department_code ?? 'Unassigned',
      designation: faculty.designation,
      email: user.email,
      phone: '',
    })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js faculty profile request failed')
  }
}
