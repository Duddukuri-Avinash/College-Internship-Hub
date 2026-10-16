import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const response = await fetch(`${backendUrl}/admin/data`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('Backend admin data request failed:', error)
    return NextResponse.json({ error: 'Admin data service is unavailable.' }, { status: 503 })
  }
}
