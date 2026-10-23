import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { apiErrorResponse, readJson } from '@/lib/server/http'

const preferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  applications: z.boolean(),
  experiences: z.boolean(),
  internships: z.boolean(),
  announcements: z.boolean(),
  questions: z.boolean(),
  account: z.boolean(),
})

type PreferenceRow = {
  in_app_enabled: boolean
  email_enabled: boolean
  applications: boolean
  experiences: boolean
  internships: boolean
  announcements: boolean
  questions: boolean
  account: boolean
}

function toClientPreferences(row: PreferenceRow) {
  return {
    inAppEnabled: row.in_app_enabled,
    emailEnabled: row.email_enabled,
    applications: row.applications,
    experiences: row.experiences,
    internships: row.internships,
    announcements: row.announcements,
    questions: row.questions,
    account: row.account,
  }
}

const defaults: PreferenceRow = {
  in_app_enabled: true,
  email_enabled: true,
  applications: true,
  experiences: true,
  internships: true,
  announcements: true,
  questions: true,
  account: true,
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, user.id)
      .query<PreferenceRow>(`
        SELECT in_app_enabled, email_enabled, applications, experiences, internships, announcements, questions, account
        FROM notification_preferences WHERE user_id = @userId
      `)
    return NextResponse.json({ preferences: toClientPreferences(result.recordset[0] ?? defaults) })
  } catch (error) {
    return apiErrorResponse(error, 'Notification preference load failed')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request)
    const input = preferencesSchema.parse(await readJson(request))
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('inAppEnabled', sql.Bit, input.inAppEnabled)
      .input('emailEnabled', sql.Bit, input.emailEnabled)
      .input('applications', sql.Bit, input.applications)
      .input('experiences', sql.Bit, input.experiences)
      .input('internships', sql.Bit, input.internships)
      .input('announcements', sql.Bit, input.announcements)
      .input('questions', sql.Bit, input.questions)
      .input('account', sql.Bit, input.account)
      .query<PreferenceRow>(`
        MERGE notification_preferences WITH (HOLDLOCK) AS target
        USING (SELECT @userId AS user_id) AS source ON target.user_id = source.user_id
        WHEN MATCHED THEN UPDATE SET
          in_app_enabled = @inAppEnabled, email_enabled = @emailEnabled,
          applications = @applications, experiences = @experiences, internships = @internships,
          announcements = @announcements, questions = @questions, account = @account,
          updated_at = GETUTCDATE()
        WHEN NOT MATCHED THEN INSERT
          (user_id, in_app_enabled, email_enabled, applications, experiences, internships, announcements, questions, account, updated_at)
          VALUES (@userId, @inAppEnabled, @emailEnabled, @applications, @experiences, @internships, @announcements, @questions, @account, GETUTCDATE())
        OUTPUT INSERTED.in_app_enabled, INSERTED.email_enabled, INSERTED.applications, INSERTED.experiences,
               INSERTED.internships, INSERTED.announcements, INSERTED.questions, INSERTED.account;
      `)
    return NextResponse.json({ preferences: toClientPreferences(result.recordset[0] ?? input) })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid notification preferences.' }, { status: 422 })
    return apiErrorResponse(error, 'Notification preference save failed')
  }
}
