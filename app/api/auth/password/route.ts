import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate, hashPassword } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { apiErrorResponse, readJson } from '@/lib/server/http'

const passwordSchema = z.object({ password: z.string().min(8).max(128) })

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    const { password } = passwordSchema.parse(await readJson(request))
    const passwordHash = await hashPassword(password)
    const pool = await getPool()
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
