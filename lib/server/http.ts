import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(`${context}:`, error)
  return NextResponse.json({ error: 'The service is temporarily unavailable.' }, { status: 503 })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ApiError('Invalid request body.', 400)
  }
}
