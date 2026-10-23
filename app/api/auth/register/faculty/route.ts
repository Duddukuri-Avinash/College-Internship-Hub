import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { notify } from '@/lib/server/notifications'

const departments: Record<string, string> = {
  CSE: 'Computer Science and Engineering (CSE)',
  'CSE-AIML': 'Computer Science and Engineering (AI & ML)',
  'CSE-DS': 'Computer Science and Engineering (Data Science)',
  AI: 'Artificial Intelligence (AI)',
  'AI-DS': 'Artificial Intelligence & Data Science (AI & DS)',
  QC: 'Quantum Computing',
  IT: 'Information Technology (IT)',
  ECE: 'Electronics and Communication Engineering (ECE)',
  EEE: 'Electrical and Electronics Engineering (EEE)',
  MECH: 'Mechanical Engineering (MECH)',
  CIV: 'Civil Engineering (CIV)',
  CHEM: 'Chemical Engineering (CHEM)',
}

const registrationSchema = z.object({
  name: z.string().trim().min(3).max(200),
  employeeId: z.string().trim().min(1).max(50),
  dept: z.string().trim().min(1).max(20),
  designation: z.string().trim().min(1).max(150),
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
    const employeeId = input.employeeId.toUpperCase()
    const departmentCode = input.dept.toUpperCase()
    const departmentName = departments[departmentCode]
    if (!departmentName) throw new ApiError('Select a valid department.', 400)

    const email = input.email.toLowerCase()
    const nameParts = input.name.split(/\s+/, 2)
    const pool = await getPool()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()

    try {
      const existing = await transaction
        .request()
        .input('email', sql.VarChar(255), email)
        .input('employeeId', sql.VarChar(50), employeeId)
        .query(`
          SELECT TOP (1) u.id
          FROM users u
          LEFT JOIN faculty f ON f.user_id = u.id
          WHERE u.email = @email OR f.employee_id = @employeeId
        `)
      if (existing.recordset.length) throw new ApiError('An account already exists for this faculty member.', 409)

      const department = await transaction
        .request()
        .input('code', sql.VarChar(20), departmentCode)
        .query<{ id: number }>('SELECT id FROM departments WHERE code = @code')
      let departmentId = department.recordset[0]?.id
      if (!departmentId) {
        const createdDepartment = await transaction
          .request()
          .input('code', sql.VarChar(20), departmentCode)
          .input('name', sql.VarChar(120), departmentName)
          .query<{ id: number }>(`
            INSERT INTO departments (code, name, is_active, created_at)
            OUTPUT INSERTED.id
            VALUES (@code, @name, 1, GETUTCDATE())
          `)
        departmentId = createdDepartment.recordset[0].id
      }

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
          VALUES (@email, @passwordHash, @firstName, @lastName, 'faculty', 1, 0, 1, GETUTCDATE(), GETUTCDATE())
        `)
      await transaction
        .request()
        .input('userId', sql.Int, user.recordset[0].id)
        .input('departmentId', sql.Int, departmentId)
        .input('employeeId', sql.VarChar(50), employeeId)
        .input('designation', sql.VarChar(150), input.designation)
        .query(`
          INSERT INTO faculty (user_id, department_id, employee_id, designation, is_verified, is_active, created_at)
          VALUES (@userId, @departmentId, @employeeId, @designation, 0, 1, GETUTCDATE())
        `)
      await transaction.commit()

      await notify({
        role: 'admin',
        type: 'account',
        category: 'account',
        title: 'Faculty account waiting for approval',
        message: `${input.name} (${employeeId}) registered as faculty and is waiting for approval.`,
        link: '/notifications',
        dedupeKey: `faculty-registration:${employeeId}`,
      })

      return NextResponse.json({
        profile: {
          id: String(user.recordset[0].id),
          email,
          full_name: input.name,
          role: 'faculty',
          status: 'active',
          first_login: true,
        },
      }, { status: 201 })
    } catch (error) {
      await transaction.rollback()
      if (isUniqueConflict(error)) throw new ApiError('An account already exists for this faculty member.', 409)
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid faculty registration details.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js faculty registration failed')
  }
}
