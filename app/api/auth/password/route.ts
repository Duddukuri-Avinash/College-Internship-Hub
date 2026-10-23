import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate, hashPassword } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { passwordResetCookieName } from '@/lib/server/password-reset'

const passwordSchema = z.object({ password: z.string().min(8).max(128) })

export async function POST(request: NextRequest) {
  try {
    const { password } = passwordSchema.parse(await readJson(request))
    const passwordHash = await hashPassword(password)
    const pool = await getPool()
    const token = request.cookies.get(passwordResetCookieName)?.value

    if (token) {
      const transaction = new sql.Transaction(pool)
      await transaction.begin()
      try {
        const tokenHash = createHash('sha256').update(token).digest('hex')
        const reset = await transaction
          .request()
          .input('tokenHash', sql.VarChar(64), tokenHash)
          .query<{ user_id: number }>(`
            SELECT TOP (1) user_id
            FROM password_reset_tokens WITH (UPDLOCK, ROWLOCK)
            WHERE token_hash = @tokenHash AND expires_at > GETUTCDATE()
          `)
        const row = reset.recordset[0]
        if (!row) throw new ApiError('Password reset link is invalid or expired.', 400)

        await transaction
          .request()
          .input('userId', sql.Int, row.user_id)
          .input('passwordHash', sql.VarChar(255), passwordHash)
          .query(`
            UPDATE users
            SET password_hash = @passwordHash, is_first_login = 0, updated_at = GETUTCDATE()
            WHERE id = @userId
          `)
        await transaction
          .request()
          .input('userId', sql.Int, row.user_id)
          .query('DELETE FROM password_reset_tokens WHERE user_id = @userId')
        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }

      const response = NextResponse.json({ status: 'updated' })
      response.cookies.delete(passwordResetCookieName)
      return response
    }

    const user = await authenticate(request)
    await pool
      .request()
      .input('userId', sql.Int, user.id)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .query('UPDATE users SET password_hash = @passwordHash, is_first_login = 0, updated_at = GETUTCDATE() WHERE id = @userId')
    return NextResponse.json({ status: 'updated' })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js password update failed')
  }
}
