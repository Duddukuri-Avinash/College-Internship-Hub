import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate } from '@/lib/server/auth'
import { getPool, sql } from '@/lib/server/db'
import { ApiError, apiErrorResponse, readJson } from '@/lib/server/http'
import { refreshRoadmaps } from '@/lib/server/roadmaps'
import type { Roadmap } from '@/lib/server/roadmaps'
import { getVerifications } from '@/lib/server/skill-verification'
import { postQuizRoute } from '@/lib/server/quiz-route'
import { readUpload, resolveUpload, uploadRoot } from '@/lib/server/uploads'

const accountSchema = z.object({
  branch: z.string().trim().min(1).max(120),
  year: z.number().int().min(1).max(10),
  section: z.string().trim().min(1).max(10),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  phone: z.string().max(30).optional().default(''),
  skills: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),
  tools: z.array(z.string()).optional().default([]),
  certifications: z.array(z.string()).optional().default([]),
  linkedin: z.string().max(500).optional().default(''),
  github: z.string().max(500).optional().default(''),
  domain: z.string().max(150).optional().default(''),
  mode: z.string().max(40).optional().default(''),
  location: z.string().max(150).optional().default(''),
}).passthrough()

const roadmapSchema = z.object({
  id: z.string().min(1).max(80),
  role: z.string().min(1).max(160),
  summary: z.string().max(500).optional().default(''),
  keywords: z.array(z.string()).max(30).optional().default([]),
  steps: z.array(z.object({
    skill: z.string().min(1).max(120),
    why: z.string().max(300).optional().default(''),
  })).min(1).max(100),
  marketRank: z.number().int().nullable().optional(),
})

const roadmapsSchema = z.object({ roadmaps: z.array(roadmapSchema).min(1).max(50) })

type StudentRow = {
  id: number
  branch: string
  year: number
  section: string | null
  cgpa: number | null
  phone: string | null
  skills: string | string[] | null
  programming_languages: string | string[] | null
  tools: string | string[] | null
  certifications: string | string[] | null
  linked_in: string | null
  github: string | null
  preferred_domain: string | null
  preferred_mode: string | null
  preferred_location: string | null
  roll_number: string
  email: string
  first_name: string
  last_name: string
  user_id: number
}

type DocumentRow = {
  id: number
  file_name: string
  storage_key: string | null
  mime_type: string | null
  file_size_bytes: number | null
  title: string
}

function arrayValue(value: string | string[] | null): string[] {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    throw new Error('Stored student profile data is invalid.')
  }
}

function requireStudent(user: Awaited<ReturnType<typeof authenticate>>) {
  if (user.role !== 'student' || user.student_id === null) {
    throw new ApiError('Student access required.', 403)
  }
  return user.student_id
}

async function getAccount(request: NextRequest) {
  const user = await authenticate(request)
  const studentId = requireStudent(user)
  const pool = await getPool()
  const result = await pool
    .request()
    .input('studentId', sql.Int, studentId)
    .query<StudentRow>(`
      SELECT s.id, s.user_id, s.roll_number, s.branch, s.year, s.section, s.cgpa, s.phone,
             s.skills, s.programming_languages, s.tools, s.certifications, s.linked_in, s.github,
             s.preferred_domain, s.preferred_mode, s.preferred_location, u.email, u.first_name, u.last_name
      FROM students s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = @studentId
    `)
  const student = result.recordset[0]
  if (!student) throw new ApiError('Student account details were not found.', 404)

  const resumeResult = await pool
    .request()
    .input('studentId', sql.Int, studentId)
    .query<DocumentRow>(`
      SELECT TOP (1) id, file_name, storage_key, mime_type, file_size_bytes, title
      FROM documents
      WHERE student_id = @studentId AND document_type = 'resume'
      ORDER BY created_at DESC
    `)
  const resume = resumeResult.recordset[0]
  return NextResponse.json({
    account: {
      fullName: `${student.first_name} ${student.last_name}`.trim(),
      email: student.email,
      rollNumber: student.roll_number,
      phone: student.phone ?? '',
      branch: student.branch,
      year: student.year,
      section: student.section ?? 'Unassigned',
      cgpa: student.cgpa,
      skills: arrayValue(student.skills),
      languages: arrayValue(student.programming_languages),
      tools: arrayValue(student.tools),
      certifications: arrayValue(student.certifications),
      linkedin: student.linked_in ?? '',
      github: student.github ?? '',
      domain: student.preferred_domain ?? '',
      mode: student.preferred_mode ?? '',
      location: student.preferred_location ?? '',
      resume: resume ? {
        id: String(resume.id),
        fileName: resume.file_name,
        storagePath: resume.storage_key ?? '',
        mimeType: resume.mime_type ?? 'application/octet-stream',
        sizeBytes: resume.file_size_bytes ?? 0,
      } : null,
    },
  })
}

async function updateAccount(request: NextRequest) {
  const user = await authenticate(request)
  const studentId = requireStudent(user)
  const input = accountSchema.parse(await readJson(request))
  const pool = await getPool()
  await pool
    .request()
    .input('studentId', sql.Int, studentId)
    .input('branch', sql.VarChar(120), input.branch)
    .input('year', sql.Int, input.year)
    .input('section', sql.VarChar(10), input.section)
    .input('cgpa', sql.Float, input.cgpa ?? null)
    .input('phone', sql.VarChar(30), input.phone.trim() || null)
    .input('skills', sql.NVarChar(sql.MAX), JSON.stringify(input.skills))
    .input('languages', sql.NVarChar(sql.MAX), JSON.stringify(input.languages))
    .input('tools', sql.NVarChar(sql.MAX), JSON.stringify(input.tools))
    .input('certifications', sql.NVarChar(sql.MAX), JSON.stringify(input.certifications))
    .input('linkedin', sql.VarChar(500), input.linkedin.trim() || null)
    .input('github', sql.VarChar(500), input.github.trim() || null)
    .input('domain', sql.VarChar(150), input.domain.trim() || null)
    .input('mode', sql.VarChar(40), input.mode.trim() || null)
    .input('location', sql.VarChar(150), input.location.trim() || null)
    .query(`
      UPDATE students
      SET branch = @branch, year = @year, section = @section, cgpa = @cgpa, phone = @phone,
          skills = @skills, programming_languages = @languages, tools = @tools, certifications = @certifications,
          linked_in = @linkedin, github = @github, preferred_domain = @domain, preferred_mode = @mode,
          preferred_location = @location, updated_at = GETUTCDATE()
      WHERE id = @studentId
    `)
  return NextResponse.json({ status: 'updated' })
}

async function uploadDocument(request: NextRequest, kind: string) {
  const user = await authenticate(request)
  const studentId = requireStudent(user)
  if (!['resume', 'offer_letter', 'certificate', 'other'].includes(kind)) {
    throw new ApiError('Unsupported document type.', 422)
  }
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new ApiError('A file is required.', 422)

  const maxSizeMb = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '5', 10)
  if (!Number.isSafeInteger(maxSizeMb) || maxSizeMb < 1) throw new Error('MAX_UPLOAD_SIZE_MB must be a positive integer.')
  const maxSize = maxSizeMb * 1024 * 1024
  if (file.size > maxSize) throw new ApiError('The file exceeds the upload size limit.', 413)
  const safeName = path.basename((file.name || 'upload.bin').replaceAll('\\', '/')).slice(0, 255)
  const storageKey = `${user.id}/${randomUUID()}-${safeName}`
  const root = uploadRoot()
  const target = resolveUpload(storageKey)
  if (!target) throw new ApiError('Invalid upload path.', 400)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(await file.arrayBuffer()), { flag: 'wx' })

  try {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('studentId', sql.Int, studentId)
      .input('kind', sql.VarChar(60), kind)
      .input('fileName', sql.VarChar(255), safeName)
      .input('storageKey', sql.VarChar(500), storageKey)
      .input('mimeType', sql.VarChar(100), file.type || null)
      .input('fileSize', sql.Int, file.size)
      .input('uploadedBy', sql.VarChar(80), String(user.id))
      .query<{ id: number }>(`
        INSERT INTO documents (student_id, document_type, title, file_name, storage_key, mime_type, file_size_bytes, status, uploaded_by, created_at)
        OUTPUT INSERTED.id
        VALUES (@studentId, @kind, @fileName, @fileName, @storageKey, @mimeType, @fileSize, 'pending', @uploadedBy, GETUTCDATE())
      `)
    return NextResponse.json({
      document: {
        id: String(result.recordset[0].id),
        fileName: safeName,
        storagePath: storageKey,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      },
    })
  } catch (error) {
    await rm(target, { force: true })
    throw error
  }
}

async function downloadDocument(request: NextRequest, documentId: string) {
  const user = await authenticate(request)
  const studentId = requireStudent(user)
  const id = Number(documentId)
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError('Document not found.', 404)
  const pool = await getPool()
  const result = await pool
    .request()
    .input('documentId', sql.Int, id)
    .input('studentId', sql.Int, studentId)
    .query<DocumentRow>(`
      SELECT id, file_name, storage_key, mime_type, file_size_bytes, title
      FROM documents
      WHERE id = @documentId AND student_id = @studentId
    `)
  const document = result.recordset[0]
  if (!document?.storage_key) throw new ApiError('Document not found.', 404)
  const contents = await readUpload(document.storage_key)
  if (!contents) throw new ApiError('Document file is not available.', 404)
  return new NextResponse(contents, {
    headers: {
      'content-type': document.mime_type ?? 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`,
    },
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: routePath } = await context.params
    if (routePath.length === 1 && routePath[0] === 'me') return await getAccount(request)
    if (routePath.length === 1 && routePath[0] === 'verifications') {
      return NextResponse.json(await getVerifications(await authenticate(request)))
    }
    if (routePath.length === 3 && routePath[0] === 'documents' && routePath[2] === 'download') {
      return await downloadDocument(request, routePath[1])
    }
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid student account details.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js student request failed')
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: routePath } = await context.params
    if (routePath.length === 1 && routePath[0] === 'me') return await updateAccount(request)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid student account details.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js student update failed')
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: routePath } = await context.params
  if (routePath[0] === 'quiz') return postQuizRoute(request, routePath)
  try {
    if (routePath.length === 3 && routePath[0] === 'me' && routePath[1] === 'documents') {
      return await uploadDocument(request, routePath[2])
    }
    if (routePath.length === 2 && routePath[0] === 'roadmaps' && routePath[1] === 'monthly') {
      const input = roadmapsSchema.parse(await readJson(request))
      return NextResponse.json(await refreshRoadmaps(await authenticate(request), input.roadmaps))
    }
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid student request.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js student request failed')
  }
}
