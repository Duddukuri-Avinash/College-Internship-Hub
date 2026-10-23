import { NextResponse, type NextRequest } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'

import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse } from '@/lib/server/http'
import { escapeHtml, sendEmail } from '@/lib/server/email'

type RecoveryRole = 'student' | 'faculty' | 'admin'

export async function POST(request: NextRequest) {
  try {
    let input: { identifier?: unknown; role?: unknown }
    try {
      input = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid recovery request.' }, { status: 400 })
    }

    const identifier = typeof input.identifier === 'string' ? input.identifier.trim() : ''
    const role = input.role
    if (!identifier || identifier.length > 254 ||
        (role !== 'student' && role !== 'faculty' && role !== 'admin')) {
      return NextResponse.json({ error: 'Enter your registered sign-in ID.' }, { status: 400 })
    }

    const pool = await getPool()
    const account = await pool
      .request()
      .input('role', sql.VarChar(20), role)
      .input('identifier', sql.VarChar(254), identifier)
      .query<{ id: number; email: string; first_name: string }>(`
        SELECT TOP (1) u.id, u.email, u.first_name
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN faculty f ON f.user_id = u.id
        LEFT JOIN admins a ON a.user_id = u.id
        WHERE u.role = @role AND u.is_active = 1
          AND (
            LOWER(u.email) = LOWER(@identifier)
            OR (@role = 'student' AND UPPER(s.roll_number) = UPPER(@identifier))
            OR (@role = 'faculty' AND UPPER(f.employee_id) = UPPER(@identifier))
            OR (@role = 'admin' AND UPPER(a.employee_id) = UPPER(@identifier))
          )
      `)
    const user = account.recordset[0]
    if (user) {
      const token = randomBytes(32).toString('base64url')
      const tokenHash = createHash('sha256').update(token).digest('hex')
      await pool
        .request()
        .input('userId', sql.Int, user.id)
        .query('DELETE FROM password_reset_tokens WHERE user_id = @userId')
      await pool
        .request()
        .input('userId', sql.Int, user.id)
        .input('tokenHash', sql.VarChar(64), tokenHash)
        .query(`
          INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
          VALUES (@userId, @tokenHash, DATEADD(MINUTE, 30, GETUTCDATE()), GETUTCDATE())
        `)

      const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
      const resetUrl = new URL('/api/auth/recovery/confirm', origin)
      resetUrl.searchParams.set('token', token)
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your InternHub password',
          text: `Hello ${user.first_name},\n\nUse this link within 30 minutes to reset your InternHub password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>Hello ${escapeHtml(user.first_name)},</p><p>Use this link within 30 minutes to reset your InternHub password:</p><p><a href="${escapeHtml(resetUrl.toString())}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        })
      } catch (error) {
        await pool
          .request()
          .input('userId', sql.Int, user.id)
          .query('DELETE FROM password_reset_tokens WHERE user_id = @userId')
        throw error
      }
    }

    return NextResponse.json({ status: 'accepted' })
  } catch (error) {
    return apiErrorResponse(error, 'Password recovery request failed')
  }
}
