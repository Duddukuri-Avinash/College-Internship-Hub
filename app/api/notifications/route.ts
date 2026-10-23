import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'

const limitSchema = z.coerce.number().int().min(1).max(100).default(20)

type NotificationRow = {
  id: number
  type: string
  category: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  read_at: Date | null
  created_at: Date
  metadata_json: string | null
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    const params = request.nextUrl.searchParams
    const limit = limitSchema.parse(params.get('limit') ?? undefined)
    const cursorValue = params.get('cursor')
    const cursor = cursorValue === null ? null : Number(cursorValue)
    if (cursor !== null && (!Number.isSafeInteger(cursor) || cursor < 1)) {
      throw new ApiError('Invalid notification cursor.', 400)
    }
    const unreadOnly = params.get('unread') === 'true'
    const pool = await getPool()
    const query = pool.request()
      .input('userId', sql.Int, user.id)
      .input('limit', sql.Int, limit)
      .input('cursor', sql.Int, cursor)
      .input('unreadOnly', sql.Bit, unreadOnly)
    const [notifications, unread] = await Promise.all([
      query.query<NotificationRow>(`
        SELECT TOP (@limit) id, type, category, title, message, link, is_read, read_at, created_at, metadata_json
        FROM notifications
        WHERE user_id = @userId
          AND (@cursor IS NULL OR id < @cursor)
          AND (@unreadOnly = 0 OR is_read = 0)
        ORDER BY created_at DESC, id DESC
      `),
      pool.request()
        .input('userId', sql.Int, user.id)
        .query<{ unread_count: number }>(`
          SELECT COUNT_BIG(*) AS unread_count FROM notifications
          WHERE user_id = @userId AND is_read = 0
        `),
    ])
    const rows = notifications.recordset
    return NextResponse.json({
      notifications: rows.map((row) => ({
        id: String(row.id),
        type: row.type,
        category: row.category,
        title: row.title,
        message: row.message,
        link: row.link,
        isRead: row.is_read,
        readAt: row.read_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : null,
      })),
      unreadCount: Number(unread.recordset[0]?.unread_count ?? 0),
      nextCursor: rows.length === limit ? String(rows[rows.length - 1].id) : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid notification limit.' }, { status: 400 })
    return apiErrorResponse(error, 'Notification list request failed')
  }
}
