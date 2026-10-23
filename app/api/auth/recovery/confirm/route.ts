import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { getPool, sql } from '@/lib/server/db'
import { passwordResetCookieName } from '@/lib/server/password-reset'

export async function GET(request: NextRequest) {
  const headers = { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }
  const token = request.nextUrl.searchParams.get('token') ?? ''
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    const invalid = new URL('/', request.url)
    invalid.searchParams.set('auth_error', 'invalid')
    return NextResponse.redirect(invalid, { headers })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const pool = await getPool()
  const result = await pool
    .request()
    .input('tokenHash', sql.VarChar(64), tokenHash)
    .query(`
      SELECT TOP (1) id
      FROM password_reset_tokens
      WHERE token_hash = @tokenHash AND expires_at > GETUTCDATE()
    `)
  const destination = new URL('/', request.url)
  if (!result.recordset.length) {
    destination.searchParams.set('auth_error', 'invalid')
    return NextResponse.redirect(destination, { headers })
  }

  destination.searchParams.set('auth', 'reset')
  const response = NextResponse.redirect(destination, { headers })
  response.cookies.set(passwordResetCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  })
  return response
}
