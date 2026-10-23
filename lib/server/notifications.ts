import { escapeHtml, sendEmail } from '@/lib/server/email'
import { getPool, sql } from '@/lib/server/db'
import type { UserRole } from '@/lib/server/auth'
import {
  isAuthenticationNotificationType,
  notificationDeliveryAllowed,
  type NotificationCategory,
  type NotificationPreferences,
} from '@/lib/server/notification-policy'

export type { NotificationCategory } from '@/lib/server/notification-policy'
type NotificationRecipient = { id: number; email: string; first_name: string }

export type NotifyInput = {
  userId?: number
  userIds?: number[]
  role?: UserRole
  type: string
  category: NotificationCategory
  title: string
  message: string
  link?: string
  metadata?: Record<string, string | number | boolean | null>
  dedupeKey?: string
  sendEmail?: boolean
  emailSubject?: string
}

function safeLog(context: string, error: unknown) {
  console.error(`Notification ${context} failed:`, error)
}

export async function notify(input: NotifyInput): Promise<{ inAppSaved: number; emailsSent: number; emailsFailed: number }> {
  let inAppSaved = 0
  let emailsSent = 0
  let emailsFailed = 0
  try {
    if (!input.userId && !input.userIds?.length && !input.role) {
      throw new Error('A notification recipient is required.')
    }
    if (!input.title.trim() || !input.message.trim()) {
      throw new Error('Notification title and message are required.')
    }
    if (isAuthenticationNotificationType(input.type)) {
      throw new Error('Authentication and recovery messages must not use notification delivery.')
    }

    const pool = await getPool()
    const request = pool.request()
    const recipientFilters: string[] = []
    if (input.userId) {
      request.input('userId', sql.Int, input.userId)
      recipientFilters.push('u.id = @userId')
    }
    if (input.userIds?.length) {
      const parameters = input.userIds.map((id, index) => {
        const name = `recipient${index}`
        request.input(name, sql.Int, id)
        return `@${name}`
      })
      recipientFilters.push(`u.id IN (${parameters.join(', ')})`)
    }
    if (input.role) {
      request.input('role', sql.VarChar(20), input.role)
      recipientFilters.push('u.role = @role')
    }

    const recipientResult = await request.query<NotificationRecipient & NotificationPreferences>(`
      SELECT DISTINCT u.id, u.email, u.first_name,
             p.in_app_enabled, p.email_enabled,
             p.applications, p.experiences, p.internships, p.announcements, p.questions, p.account
      FROM users u
      LEFT JOIN notification_preferences p ON p.user_id = u.id
      WHERE u.is_active = 1 AND (${recipientFilters.join(' OR ')})
    `)

    for (const user of recipientResult.recordset) {
      const preferences = user as NotificationRecipient & NotificationPreferences
      const shouldSaveInApp = notificationDeliveryAllowed(input.type, preferences, input.category, 'in_app_enabled')
      const shouldSendEmail = input.sendEmail === true
        && Boolean(user.email)
        && notificationDeliveryAllowed(input.type, preferences, input.category, 'email_enabled')
      let inserted = true

      if (shouldSaveInApp) {
        try {
          const result = await pool
            .request()
            .input('userId', sql.Int, user.id)
            .input('type', sql.VarChar(50), input.type)
            .input('category', sql.VarChar(30), input.category)
            .input('title', sql.NVarChar(200), input.title.trim())
            .input('message', sql.NVarChar(2000), input.message.trim())
            .input('link', sql.VarChar(500), input.link ?? null)
            .input('metadata', sql.NVarChar(sql.MAX), input.metadata ? JSON.stringify(input.metadata) : null)
            .input('dedupeKey', sql.VarChar(160), input.dedupeKey ?? null)
            .query<{ id: number }>(`
              IF @dedupeKey IS NULL OR NOT EXISTS (
                SELECT 1 FROM notifications WHERE user_id = @userId AND dedupe_key = @dedupeKey
              )
              BEGIN
                INSERT INTO notifications (user_id, type, category, title, message, link, metadata_json, dedupe_key)
                OUTPUT INSERTED.id
                VALUES (@userId, @type, @category, @title, @message, @link, @metadata, @dedupeKey)
              END
            `)
          inserted = result.recordset.length > 0
          inAppSaved += result.recordset.length
        } catch (error) {
          inserted = false
          safeLog(`persistence for user ${user.id}`, error)
        }
      }

      if (shouldSendEmail && inserted) {
        try {
          const subject = input.emailSubject ?? input.title
          const linkText = input.link ? `\n\nOpen in InternHub: ${input.link}` : ''
          await sendEmail({
            to: user.email,
            subject,
            text: `Hello ${user.first_name},\n\n${input.message}${linkText}\n\nThis is an automatic InternHub notification.`,
            html: `<p>Hello ${escapeHtml(user.first_name)},</p><p>${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>${input.link ? `<p><a href="${escapeHtml(input.link)}">Open in InternHub</a></p>` : ''}<p><small>This is an automatic InternHub notification.</small></p>`,
          })
          emailsSent += 1
        } catch (error) {
          emailsFailed += 1
          safeLog(`email delivery for user ${user.id}`, error)
        }
      }
    }
  } catch (error) {
    safeLog(`dispatch (${input.category})`, error)
  }
  return { inAppSaved, emailsSent, emailsFailed }
}
