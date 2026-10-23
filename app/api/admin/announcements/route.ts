import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { notify } from '@/lib/server/notifications'

const announcementSchema = z.object({
  title: z.string().trim().min(5).max(200),
  body: z.string().trim().min(10).max(10_000),
  link: z.string().url().optional().or(z.literal('')),
  role: z.enum(['Students', 'Faculty', 'Everyone']),
  branches: z.array(z.string().trim().min(1).max(20)).max(20),
  years: z.array(z.number().int().min(1).max(10)).max(10),
  section: z.string().trim().max(10),
})

type RecipientRow = { id: number }

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (user.role !== 'admin') throw new ApiError('Administrator access required.', 403)

    const input = announcementSchema.parse(await readJson(request))
    const pool = await getPool()
    const query = pool.request()
      .input('role', sql.VarChar(20), input.role)
      .input('hasBranches', sql.Bit, input.branches.length > 0)
      .input('hasYears', sql.Bit, input.years.length > 0)
      .input('section', sql.VarChar(10), input.section === 'All' ? null : input.section)
    const branchClauses: string[] = []
    input.branches.forEach((branch, index) => {
      const parameter = `branch${index}`
      query.input(parameter, sql.VarChar(20), branch)
      branchClauses.push(`@${parameter}`)
    })
    const yearClauses: string[] = []
    input.years.forEach((year, index) => {
      const parameter = `year${index}`
      query.input(parameter, sql.Int, year)
      yearClauses.push(`@${parameter}`)
    })
    const branchFilter = branchClauses.length
      ? `(${branchClauses.map((branch) => `(s.branch = ${branch} OR d.code = ${branch})`).join(' OR ')})`
      : '1 = 1'
    const yearFilter = yearClauses.length ? `s.year IN (${yearClauses.join(', ')})` : '1 = 1'
    const recipientResult = await query.query<RecipientRow>(`
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN faculty f ON f.user_id = u.id
      LEFT JOIN departments d ON d.id = COALESCE(s.department_id, f.department_id)
      WHERE u.is_active = 1
        AND (
          (@role = 'Students' AND u.role = 'student' AND s.is_active = 1)
          OR (@role = 'Faculty' AND u.role = 'faculty' AND f.is_active = 1 AND f.is_verified = 1)
          OR (@role = 'Everyone' AND (
            (u.role = 'student' AND s.is_active = 1)
            OR (u.role = 'faculty' AND f.is_active = 1 AND f.is_verified = 1)
          ))
        )
        AND (@hasBranches = 0 OR ${branchFilter})
        AND (@hasYears = 0 OR (u.role = 'faculty' OR ${yearFilter}))
        AND (@section IS NULL OR u.role = 'faculty' OR s.section = @section)
    `)
    const userIds = recipientResult.recordset.map((row) => row.id)
    if (!userIds.length) throw new ApiError('There are no active users in this audience.', 422)
    const result = await notify({
      userIds,
      type: 'announcement',
      category: 'announcements',
      title: input.title,
      message: input.body,
      link: input.link || '/notifications',
      metadata: input.link ? { externalLink: input.link } : undefined,
      dedupeKey: `admin-announcement:${randomUUID()}`,
      sendEmail: true,
      emailSubject: input.title,
    })

    return NextResponse.json({
      status: 'sent',
      recipients: userIds.length,
      inAppSaved: result.inAppSaved,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Check the announcement fields and try again.' }, { status: 422 })
    return apiErrorResponse(error, 'Admin announcement email failed')
  }
}
