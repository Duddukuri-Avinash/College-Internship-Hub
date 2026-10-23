import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'
import { notificationOwnerMatches } from '@/lib/server/notification-policy'

function notificationId(value: string) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError('Notification not found.', 404)
  return id
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request)
    const id = notificationId((await context.params).id)
    const pool = await getPool()
    const ownership = await pool.request()
      .input('id', sql.Int, id)
      .query<{ user_id: number }>('SELECT user_id FROM notifications WHERE id = @id')
    const notification = ownership.recordset[0]
    if (!notification || !notificationOwnerMatches(notification.user_id, user.id)) {
      throw new ApiError('Notification not found.', 404)
    }
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('userId', sql.Int, user.id)
      .query(`
        UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, GETUTCDATE())
        WHERE id = @id AND user_id = @userId
      `)
    if (!result.rowsAffected[0]) throw new ApiError('Notification not found.', 404)
    return NextResponse.json({ status: 'read' })
  } catch (error) {
    return apiErrorResponse(error, 'Notification read update failed')
  }
}
