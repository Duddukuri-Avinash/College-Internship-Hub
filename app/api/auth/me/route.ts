import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const response = await fetch(`${backendUrl}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const body = await response.text()
    let result: { profile?: unknown; detail?: string } = {}
    if (body) {
      try {
        result = JSON.parse(body) as typeof result
      } catch {
        return NextResponse.json(
          { error: response.ok ? 'Invalid account response.' : 'Authentication required.' },
          { status: response.ok ? 502 : 401 },
        )
      }
    }
    return NextResponse.json(
      response.ok ? result : { error: result.detail ?? 'Authentication required.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Backend session request failed:', error)
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 })
  }
}
