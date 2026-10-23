import { randomUUID } from 'node:crypto'

import skillCatalog from '@/lib/server/skill-catalog.json'
import { getPool, sql } from '@/lib/server/db'
import { ApiError } from '@/lib/server/http'
import type { CurrentUser } from '@/lib/server/auth'

const PASS_MARK = 0.7
const COOLDOWN_MS = 24 * 60 * 60 * 1000
const ATTEMPT_LIFETIME_MS = 16 * 60 * 1000
const rateHits = new Map<string, number[]>()
const knownSkills = new Set(skillCatalog.skills)
const technicalSkills = new Set(skillCatalog.technicalSkills)

type Question = { q: string; o: string[]; a: number }
type PublicQuestion = { q: string; o: string[] }

function dateValue(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function jsonValue<T>(value: T | string): T {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as T
  } catch {
    throw new ApiError('Stored quiz data is invalid.', 500)
  }
}

export function studentId(user: CurrentUser): number {
  if (user.student_id === null) throw new ApiError('Skill verification is available to students only.', 403)
  return user.student_id
}

export function checkSkill(value: string, extraSkills: ReadonlySet<string> = new Set()): string {
  const skill = value.trim()
  if (!knownSkills.has(skill) && !extraSkills.has(skill)) throw new ApiError('Unknown skill.', 422)
  return skill
}

export function checkLevel(value: string): 'Beginner' | 'Intermediate' | 'Advanced' {
  const level = value.trim().toLowerCase()
  if (level === 'beginner') return 'Beginner'
  if (level === 'intermediate') return 'Intermediate'
  if (level === 'advanced') return 'Advanced'
  throw new ApiError('Level must be Beginner, Intermediate, or Advanced.', 422)
}

export function isTechnicalSkill(skill: string): boolean {
  return technicalSkills.has(skill)
}

export function rateLimit(userId: number, action: string, limit = 10) {
  const now = Date.now()
  const key = `${userId}:${action}`
  const hits = (rateHits.get(key) ?? []).filter((hit) => now - hit < 60_000)
  if (hits.length >= limit) throw new ApiError('Too many requests. Try again shortly.', 429)
  hits.push(now)
  rateHits.set(key, hits)
}

export function gradeQuiz(answerKey: number[], answers: number[], tabLeaves: number) {
  const score = tabLeaves > 2 ? 0 : answers.slice(0, answerKey.length).reduce(
    (total, answer, index) => total + Number(answer === answerKey[index]),
    0,
  )
  return { score, passed: score / answerKey.length >= PASS_MARK }
}

export function githubChecksPass(checks: { passed: boolean }[]) {
  return checks.slice(0, 3).every((item) => item.passed)
    && checks.slice(3, 7).filter((item) => item.passed).length / 4 >= 0.75
}

function validQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Question => {
    if (!item || typeof item !== 'object') return false
    const question = item as Record<string, unknown>
    return typeof question.q === 'string'
      && Array.isArray(question.o)
      && question.o.length === 4
      && question.o.every((option) => typeof option === 'string')
      && new Set(question.o).size === 4
      && Number.isInteger(question.a)
      && Number(question.a) >= 0
      && Number(question.a) < 4
  })
}

function publicQuestions(questions: Question[]): { questions: PublicQuestion[]; answerKey: number[] } {
  const answerKey: number[] = []
  const publicItems = questions.slice(0, 15).map(({ q, o, a }) => {
    const options = o.map((text, index) => ({ text, correct: index === a }))
    for (let index = options.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1))
      ;[options[index], options[target]] = [options[target], options[index]]
    }
    answerKey.push(options.findIndex((option) => option.correct))
    return { q, o: options.map((option) => option.text) }
  })
  return { questions: publicItems, answerKey }
}

async function generateQuestions(skill: string, level: string): Promise<Question[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new ApiError('Quiz generation is not configured.', 503)
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'
  const prompt = `Write 15 multiple-choice questions testing practical knowledge of "${skill}" at a ${level} level. For Beginner use fundamentals and simple examples; for Intermediate use applied scenarios; for Advanced use trade-offs, debugging, design, and edge cases. Return JSON only: {"questions":[{"q":"...","o":["...","...","...","..."],"a":0}]}. Each question must have exactly four distinct options and one correct index.`
  const schema = {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            o: { type: 'array', items: { type: 'string' } },
            a: { type: 'integer', minimum: 0, maximum: 3 },
          },
          required: ['q', 'o', 'a'],
        },
      },
    },
    required: ['questions'],
  }

  let response: Response
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model,
        input: prompt,
        system_instruction: 'You create accurate, unambiguous assessment questions. Return only valid JSON.',
        response_format: [{ type: 'text', mime_type: 'application/json', schema }],
        store: false,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    console.error('Gemini quiz generation request failed:', error)
    throw new ApiError('Unable to prepare the quiz.', 502)
  }

  if (!response.ok) {
    const detail = await response.text()
    console.error(`Gemini quiz generation returned HTTP ${response.status}:`, detail)
    if (response.status === 429) throw new ApiError('Gemini rate limit or quota exceeded. Check the Gemini API key and billing quota.', 503)
    if (response.status === 404) throw new ApiError('The configured Gemini model is unavailable. Check GEMINI_MODEL.', 503)
    if ([401, 403].includes(response.status)) throw new ApiError('Gemini rejected the API key. Check GEMINI_API_KEY.', 503)
    throw new ApiError('Unable to prepare the quiz.', 502)
  }

  try {
    const payload = await response.json() as {
      steps?: { type?: string; content?: { type?: string; text?: string }[] }[]
    }
    const text = (payload.steps ?? [])
      .filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join('')
    const parsed: unknown = JSON.parse(text)
    const questions = validQuestions(
      parsed && typeof parsed === 'object' && 'questions' in parsed
        ? (parsed as { questions: unknown }).questions
        : parsed,
    )
    if (questions.length < 10) throw new ApiError('Generated question bank was invalid.', 502)
    return questions
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error('Gemini returned an invalid question bank:', error)
    throw new ApiError('Unable to prepare the quiz.', 502)
  }
}

export async function getRoadmapSkills(): Promise<Set<string>> {
  const market = process.env.ROADMAP_MARKET ?? 'India'
  const pool = await getPool()
  const result = await pool
    .request()
    .input('market', sql.VarChar(80), market)
    .query<{ roadmaps: string | unknown[] }>(`
      SELECT TOP (1) roadmaps
      FROM roadmap_snapshots
      WHERE market = @market
      ORDER BY month DESC
    `)
  const latest = result.recordset[0]?.roadmaps
  if (!latest) return new Set()
  const roadmaps = jsonValue<unknown[]>(latest)
  return new Set(roadmaps.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('steps' in item) || !Array.isArray(item.steps)) return []
    return item.steps.flatMap((step) =>
      step && typeof step === 'object' && 'skill' in step && typeof step.skill === 'string' ? [step.skill] : [],
    )
  }))
}

async function questionBank(skill: string, level: string): Promise<Question[]> {
  const pool = await getPool()
  const bankKey = `${skill}::${level}`
  const stored = await pool
    .request()
    .input('skill', sql.VarChar(120), bankKey)
    .query<{ questions: string | unknown[] }>('SELECT questions FROM skill_question_banks WHERE skill = @skill')
  let questions = stored.recordset[0] ? validQuestions(jsonValue(stored.recordset[0].questions)) : []
  if (!stored.recordset[0]) {
    questions = await generateQuestions(skill, level)
    await pool
      .request()
      .input('skill', sql.VarChar(120), bankKey)
      .input('questions', sql.NVarChar(sql.MAX), JSON.stringify(questions))
      .query(`
        INSERT INTO skill_question_banks (skill, questions, source, created_at)
        VALUES (@skill, @questions, 'gemini', GETUTCDATE())
      `)
  }
  if (questions.length < 10) throw new ApiError('The stored question bank is invalid.', 502)
  return questions
}

export async function getVerifications(user: CurrentUser) {
  const id = studentId(user)
  const pool = await getPool()
  const result = await pool
    .request()
    .input('studentId', sql.Int, id)
    .query<{ skill: string; method: string | null; detail: string | null; verified_at: Date | null }>(`
      SELECT skill, method, detail, verified_at
      FROM verifications
      WHERE student_id = @studentId AND skill IS NOT NULL
    `)
  return {
    verifications: result.recordset.map((row) => ({
      skill: row.skill,
      method: row.method,
      detail: row.detail,
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    })),
  }
}

export async function startQuiz(user: CurrentUser, input: { skill: string; level?: string }) {
  rateLimit(user.id, 'quiz-start')
  studentId(user)
  const extraSkills = await getRoadmapSkills()
  const skill = checkSkill(input.skill, extraSkills)
  const level = checkLevel(input.level ?? 'Beginner')
  const pool = await getPool()
  const cooldownResult = await pool
    .request()
    .input('userId', sql.Int, user.id)
    .input('skill', sql.VarChar(120), skill)
    .query<{ failed_at: Date }>(`
      SELECT TOP (1) failed_at
      FROM skill_quiz_cooldowns
      WHERE user_id = @userId AND skill = @skill
    `)
  const failedAt = cooldownResult.recordset[0]?.failed_at
  if (failedAt && Date.now() - new Date(failedAt).getTime() < COOLDOWN_MS) {
    const remainingHours = Math.max(1, Math.floor((COOLDOWN_MS - (Date.now() - new Date(failedAt).getTime())) / 3_600_000) + 1)
    throw new ApiError(`Retake available in ${remainingHours} hour(s).`, 429)
  }

  const questions = await questionBank(skill, level)
  const { questions: publicItems, answerKey } = publicQuestions(questions)
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + ATTEMPT_LIFETIME_MS)
  await pool
    .request()
    .input('id', sql.VarChar(36), id)
    .input('userId', sql.Int, user.id)
    .input('skill', sql.VarChar(120), skill)
    .input('answerKey', sql.NVarChar(sql.MAX), JSON.stringify(answerKey))
    .input('expiresAt', sql.DateTime, expiresAt)
    .query(`
      INSERT INTO skill_quiz_attempts (id, user_id, skill, answer_key, expires_at, tab_leaves, created_at)
      VALUES (@id, @userId, @skill, @answerKey, @expiresAt, 0, GETUTCDATE())
    `)
  return { id, questions: publicItems, expiresAt: `${expiresAt.toISOString().replace(/Z$/, '')}Z` }
}

export async function recordQuizTabLeave(user: CurrentUser, attemptId: string) {
  studentId(user)
  const pool = await getPool()
  const result = await pool
    .request()
    .input('attemptId', sql.VarChar(36), attemptId)
    .input('userId', sql.Int, user.id)
    .query<{ recorded: boolean }>(`
      UPDATE skill_quiz_attempts SET tab_leaves = tab_leaves + 1
      WHERE id = @attemptId AND user_id = @userId AND submitted_at IS NULL
      SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM skill_quiz_attempts WHERE id = @attemptId AND user_id = @userId
      ) THEN 1 ELSE 0 END AS bit) AS recorded
    `)
  return { recorded: Boolean(result.recordset[0]?.recorded) }
}

export async function submitQuiz(user: CurrentUser, input: { id: string; answers: number[] }) {
  rateLimit(user.id, 'quiz-submit')
  const id = studentId(user)
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    const attemptResult = await transaction
      .request()
      .input('attemptId', sql.VarChar(36), input.id)
      .input('userId', sql.Int, user.id)
      .query<{ skill: string; answer_key: string | number[]; expires_at: Date; tab_leaves: number; submitted_at: Date | null }>(`
        SELECT skill, answer_key, expires_at, tab_leaves, submitted_at
        FROM skill_quiz_attempts WITH (UPDLOCK, ROWLOCK)
        WHERE id = @attemptId AND user_id = @userId
      `)
    const attempt = attemptResult.recordset[0]
    if (!attempt || attempt.submitted_at || Date.now() > new Date(attempt.expires_at).getTime()) {
      throw new ApiError('This attempt expired or was already submitted.', 400)
    }
    const answerKey = jsonValue<number[]>(attempt.answer_key)
    if (!answerKey.length) throw new ApiError('This attempt has invalid answer data.', 500)
    const { score, passed } = gradeQuiz(answerKey, input.answers, attempt.tab_leaves)
    await transaction
      .request()
      .input('attemptId', sql.VarChar(36), input.id)
      .query('UPDATE skill_quiz_attempts SET submitted_at = GETUTCDATE() WHERE id = @attemptId')

    if (passed) {
      const currentVerification = await transaction
        .request()
        .input('studentId', sql.Int, id)
        .input('skill', sql.VarChar(120), attempt.skill)
        .query<{ id: number }>('SELECT TOP (1) id FROM verifications WHERE student_id = @studentId AND skill = @skill')
      if (currentVerification.recordset.length) {
        await transaction
          .request()
          .input('studentId', sql.Int, id)
          .input('skill', sql.VarChar(120), attempt.skill)
          .input('detail', sql.VarChar(30), String(score))
          .query(`
            UPDATE verifications SET method = 'quiz', detail = @detail, verified_at = GETUTCDATE(),
              decision = 'verified', created_at = GETUTCDATE()
            WHERE student_id = @studentId AND skill = @skill
          `)
      } else {
        await transaction
          .request()
          .input('studentId', sql.Int, id)
          .input('skill', sql.VarChar(120), attempt.skill)
          .input('detail', sql.VarChar(30), String(score))
          .query(`
            INSERT INTO verifications (student_id, skill, method, detail, verified_at, decision, created_at)
            VALUES (@studentId, @skill, 'quiz', @detail, GETUTCDATE(), 'verified', GETUTCDATE())
          `)
      }
    } else {
      const cooldown = await transaction
        .request()
        .input('userId', sql.Int, user.id)
        .input('skill', sql.VarChar(120), attempt.skill)
        .query<{ id: number }>('SELECT TOP (1) id FROM skill_quiz_cooldowns WHERE user_id = @userId AND skill = @skill')
      if (cooldown.recordset.length) {
        await transaction
          .request()
          .input('userId', sql.Int, user.id)
          .input('skill', sql.VarChar(120), attempt.skill)
          .query('UPDATE skill_quiz_cooldowns SET failed_at = GETUTCDATE() WHERE user_id = @userId AND skill = @skill')
      } else {
        await transaction
          .request()
          .input('userId', sql.Int, user.id)
          .input('skill', sql.VarChar(120), attempt.skill)
          .query(`
            INSERT INTO skill_quiz_cooldowns (user_id, skill, failed_at)
            VALUES (@userId, @skill, GETUTCDATE())
          `)
      }
    }

    await transaction.commit()
    return { score, total: answerKey.length, passed, correctAnswers: answerKey }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
