import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { accessTokenCookieOptions, createAccessToken, verifyPassword, type UserRole } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(1024),
  role: z.enum(['student', 'faculty', 'admin']),
})

type LoginRow = {
  id: number
  email: string
  password_hash: string | null
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  is_first_login: boolean
  roll_number: string | null
  employee_id: string | null
  is_verified: boolean | null
}

function profile(user: LoginRow) {
  return {
    id: String(user.id),
    email: user.email,
    full_name: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
    first_login: user.is_first_login,
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await readJson(request))
    const pool = await getPool()
    const query = pool.request().input('role', sql.VarChar(20), input.role).input('email', sql.VarChar(255), input.identifier.toLowerCase())

    if (input.role === 'student') {
      query.input('identifier', sql.VarChar(30), input.identifier.toUpperCase())
    } else if (input.role === 'faculty') {
      query.input('identifier', sql.VarChar(50), input.identifier.toUpperCase())
    } else {
      query.input('identifier', sql.VarChar(50), input.identifier.toUpperCase())
    }

    const roleTable = input.role === 'student' ? 'students' : input.role === 'faculty' ? 'faculty' : 'admins'
    const employeeColumn = input.role === 'student' ? 'roll_number' : 'employee_id'
    const result = await query.query<LoginRow>(`
      SELECT TOP (1) u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role,
             u.is_active, u.is_first_login, s.roll_number, f.employee_id, f.is_verified
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN faculty f ON f.user_id = u.id
      LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.role = @role
        AND (
          u.email = @email
          OR EXISTS (SELECT 1 FROM ${roleTable} p WHERE p.user_id = u.id AND p.${employeeColumn} = @identifier)
        )
    `)
    const user = result.recordset[0]
    if (!user?.password_hash || !(await verifyPassword(input.password, user.password_hash))) {
      throw new ApiError('Account or password is incorrect.', 401)
    }
    if (!user.is_active) throw new ApiError('This account is not active.', 403)
    if (input.role === 'faculty' && !user.is_verified) {
      throw new ApiError('This faculty account is pending admin approval.', 403)
    }

    const response = NextResponse.json({ profile: profile(user) })
    response.cookies.set('internhub_access_token', await createAccessToken(user.id), accessTokenCookieOptions())
    return response
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid login request.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js login failed')
  }
}
