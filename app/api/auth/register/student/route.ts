import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid registration request.' }, { status: 400 })
  }

  try {
    const response = await fetch(`${backendUrl}/auth/register/student`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? 'Registration failed.' }, { status: response.status })
    }
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('Backend student registration request failed:', error)
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 })
  }
}
