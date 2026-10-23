import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'

const registrationSchema = z.object({
  name: z.string().trim().min(3).max(200),
  roll: z.string().trim().min(1).max(30),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(128),
})

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'number' in error && [2601, 2627].includes(Number(error.number))
}

export async function POST(request: Request) {
  try {
    const input = registrationSchema.parse(await readJson(request))
    const roll = input.roll.toUpperCase()
    const email = input.email.toLowerCase()
    const nameParts = input.name.split(/\s+/, 2)
    const pool = await getPool()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()

    try {
      const existing = await transaction
        .request()
        .input('roll', sql.VarChar(30), roll)
        .input('email', sql.VarChar(255), email)
        .query(`
          SELECT TOP (1) u.id
          FROM users u
          LEFT JOIN students s ON s.user_id = u.id
          WHERE s.roll_number = @roll OR u.email = @email
        `)
      if (existing.recordset.length) throw new ApiError('An account already exists for this roll number.', 409)

      const passwordHash = await hashPassword(input.password)
      const user = await transaction
        .request()
        .input('email', sql.VarChar(255), email)
        .input('passwordHash', sql.VarChar(255), passwordHash)
        .input('firstName', sql.VarChar(100), nameParts[0])
        .input('lastName', sql.VarChar(100), nameParts[1] ?? '')
        .query<{ id: number }>(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_email_verified, is_first_login, created_at, updated_at)
          OUTPUT INSERTED.id
          VALUES (@email, @passwordHash, @firstName, @lastName, 'student', 1, 0, 1, GETUTCDATE(), GETUTCDATE())
        `)
      await transaction
        .request()
        .input('userId', sql.Int, user.recordset[0].id)
        .input('roll', sql.VarChar(30), roll)
        .input('phone', sql.VarChar(30), input.phone)
        .query(`
          INSERT INTO students (user_id, roll_number, year, phone, branch, is_active, created_at, updated_at)
          VALUES (@userId, @roll, 1, @phone, 'Unassigned', 1, GETUTCDATE(), GETUTCDATE())
        `)
      await transaction.commit()

      return NextResponse.json({
        profile: {
          id: String(user.recordset[0].id),
          email,
          full_name: input.name,
          role: 'student',
          status: 'active',
          first_login: true,
        },
      }, { status: 201 })
    } catch (error) {
      await transaction.rollback()
      if (isUniqueConflict(error)) throw new ApiError('An account already exists for this roll number.', 409)
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid student registration details.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js student registration failed')
  }
}
