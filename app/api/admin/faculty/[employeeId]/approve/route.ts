import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const { employeeId } = await params

  try {
    const response = await fetch(`${backendUrl}/admin/faculty/${encodeURIComponent(employeeId)}/approve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? result.error ?? 'Could not approve faculty registration.' }, { status: response.status })
    }
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('Backend faculty approval request failed:', error)
    return NextResponse.json({ error: 'Admin approval service is unavailable.' }, { status: 503 })
  }
}
