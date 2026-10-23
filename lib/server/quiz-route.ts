import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { authenticate } from '@/lib/server/auth'
import { apiErrorResponse, readJson } from '@/lib/server/http'
import { recordQuizTabLeave, startQuiz, submitQuiz } from '@/lib/server/skill-verification'

const startSchema = z.object({
  skill: z.string().min(1).max(120),
  level: z.string().min(7).max(12).optional().default('Beginner'),
})

const submitSchema = z.object({
  id: z.string().min(1).max(36),
  answers: z.array(z.number().int()).min(1).max(15),
})

export async function postQuizRoute(request: NextRequest, path: string[]) {
  try {
    const user = await authenticate(request)
    const action = path[path.length - 1]
    if (action === 'start') {
      const input = startSchema.parse(await readJson(request))
      return NextResponse.json(await startQuiz(user, input))
    }
    if (action === 'tab-leave') {
      const attemptId = request.nextUrl.searchParams.get('attempt_id')?.trim()
      if (!attemptId || attemptId.length > 36) {
        return NextResponse.json({ error: 'Invalid quiz attempt.' }, { status: 422 })
      }
      return NextResponse.json(await recordQuizTabLeave(user, attemptId))
    }
    if (action === 'submit') {
      const input = submitSchema.parse(await readJson(request))
      return NextResponse.json(await submitQuiz(user, input))
    }
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid quiz request.' }, { status: 422 })
    return apiErrorResponse(error, 'Next.js quiz request failed')
  }
}
