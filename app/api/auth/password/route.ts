import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const response = await fetch(`${backendUrl}/auth/password`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: await request.text(),
  })
  const result = await response.json()
  return NextResponse.json(response.ok ? result : { error: result.detail ?? 'Password update failed.' }, { status: response.status })
}
