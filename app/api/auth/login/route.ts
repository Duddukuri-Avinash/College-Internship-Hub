import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 })
  }

  try {
    const response = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    })
    const result = await response.json()
    if (!response.ok) return NextResponse.json({ error: result.detail ?? 'Sign-in failed.' }, { status: response.status })

    const nextResponse = NextResponse.json({ profile: result.profile })
    nextResponse.cookies.set('internhub_access_token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    })
    return nextResponse
  } catch (error) {
    console.error('Backend authentication request failed:', error)
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 })
  }
}
