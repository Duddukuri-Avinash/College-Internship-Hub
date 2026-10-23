import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { notify } from '@/lib/server/notifications'

const announcementSchema = z.object({
  title: z.string().trim().min(5).max(120),
  body: z.string().trim().min(20).max(10_000),
  audienceType: z.enum(['all', 'year', 'section']),
  year: z.coerce.number().int().min(1).max(10).optional(),
  section: z.string().trim().min(1).max(10).optional(),
  deadline: z.string().date().optional(),
})

type RecipientRow = { id: number }

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'faculty' || user.faculty_id === null || !user.faculty_verified) {
      throw new ApiError('Verified faculty access required.', 403)
    }
    if (user.department_id === null || !user.department_code) {
      throw new ApiError('Your faculty profile needs a department before announcements can be sent.', 422)
    }

    const input = announcementSchema.parse(await readJson(request))
    if (input.audienceType === 'year' && input.year === undefined) {
      throw new ApiError('Choose a year for this announcement.', 422)
    }
    if (input.audienceType === 'section' && !input.section) {
      throw new ApiError('Choose a section for this announcement.', 422)
    }

    const pool = await getPool()
    const recipients = await pool
      .request()
      .input('departmentId', sql.Int, user.department_id)
      .input('departmentCode', sql.VarChar(20), user.department_code)
      .input('year', sql.Int, input.audienceType === 'year' ? input.year ?? null : null)
      .input('section', sql.VarChar(10), input.audienceType === 'section' ? input.section ?? null : null)
      .query<RecipientRow>(`
        SELECT DISTINCT u.id
        FROM students s
        INNER JOIN users u ON u.id = s.user_id
        WHERE u.is_active = 1 AND s.is_active = 1
          AND (s.department_id = @departmentId OR s.branch = @departmentCode)
          AND (@year IS NULL OR s.year = @year)
          AND (@section IS NULL OR s.section = @section)
      `)
    const userIds = recipients.recordset.map((row) => row.id)
    if (!userIds.length) throw new ApiError('There are no active students in this audience.', 422)

    const audience = input.audienceType === 'all'
      ? 'All eligible students'
      : input.audienceType === 'year'
        ? `Year ${input.year} · All sections`
        : `Section ${input.section}`
    const message = `${input.body}${input.deadline ? `\n\nDeadline: ${input.deadline}` : ''}\n\n${audience}`
    const result = await notify({
      userIds,
      type: 'announcement',
      category: 'announcements',
      title: input.title,
      message,
      link: '/notifications',
      dedupeKey: `faculty-announcement:${randomUUID()}`,
      sendEmail: true,
      emailSubject: input.title,
    })

    return NextResponse.json({
      status: 'sent',
      recipients: userIds.length,
      inAppSaved: result.inAppSaved,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
      audience,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Check the announcement fields and try again.' }, { status: 422 })
    return apiErrorResponse(error, 'Faculty announcement email failed')
  }
}
