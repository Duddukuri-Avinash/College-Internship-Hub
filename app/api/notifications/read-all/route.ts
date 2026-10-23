import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { apiErrorResponse } from '@/lib/server/http'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, GETUTCDATE())
        WHERE user_id = @userId AND is_read = 0
      `)
    return NextResponse.json({ status: 'read', updated: result.rowsAffected[0] ?? 0 })
  } catch (error) {
    return apiErrorResponse(error, 'Mark all notifications read failed')
  }
}
