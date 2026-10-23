import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

import { ApiError } from '@/lib/server/http'
import { getPool, sql } from '@/lib/server/db'

const ACCESS_TOKEN_COOKIE = 'internhub_access_token'
const PASSWORD_COST = 12

export type UserRole = 'student' | 'faculty' | 'admin'

export type CurrentUser = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  is_first_login: boolean
  student_id: number | null
  faculty_id: number | null
  department_id: number | null
  department_code: string | null
  faculty_verified: boolean | null
}

type UserRow = Omit<CurrentUser, 'student_id' | 'faculty_id' | 'department_id' | 'department_code' | 'faculty_verified'> & {
  password_hash: string | null
  student_id: number | null
  faculty_id: number | null
  department_id: number | null
  department_code: string | null
  faculty_verified: boolean | null
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET_KEY must be configured with at least 32 characters.')
  }
  return new TextEncoder().encode(secret)
}

export function signingKey(): Uint8Array {
  return secretKey()
}

export async function createAccessToken(userId: number): Promise<string> {
  const minutes = Number.parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES ?? '60', 10)
  const expiresIn = Number.isFinite(minutes) && minutes > 0 ? `${minutes}m` : '60m'
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey())
}

export async function authenticate(request: NextRequest): Promise<CurrentUser> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) throw new ApiError('Authentication required.', 401)

  let userId: number
  try {
    const verified = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    userId = Number(verified.payload.sub)
  } catch {
    throw new ApiError('Invalid authentication token.', 401)
  }

  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new ApiError('Invalid authentication token.', 401)
  }

  const pool = await getPool()
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query<UserRow>(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.is_first_login,
             s.id AS student_id, f.id AS faculty_id, f.department_id, d.code AS department_code,
             f.is_verified AS faculty_verified
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN faculty f ON f.user_id = u.id
      LEFT JOIN departments d ON d.id = f.department_id
      WHERE u.id = @userId
    `)
  const user = result.recordset[0]

  if (!user || !user.is_active) throw new ApiError('Account is not active.', 401)
  if (!['student', 'faculty', 'admin'].includes(user.role)) {
    throw new ApiError('Account role is invalid.', 403)
  }

  return user
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, PASSWORD_COST)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash)
}

export function accessTokenCookieOptions() {
  const minutes = Number.parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES ?? '60', 10)
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60,
  }
}

export const accessTokenCookieName = ACCESS_TOKEN_COOKIE
