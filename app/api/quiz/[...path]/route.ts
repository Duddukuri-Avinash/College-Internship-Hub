import type { NextRequest } from 'next/server'

import { postQuizRoute } from '@/lib/server/quiz-route'

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return postQuizRoute(request, (await context.params).path)
}
