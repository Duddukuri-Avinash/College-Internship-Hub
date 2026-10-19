import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const { documentId } = await params

  try {
    const response = await fetch(`${backendUrl}/faculty/verifications/${encodeURIComponent(documentId)}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('Backend faculty verification update failed:', error)
    return NextResponse.json({ error: 'Faculty verification service is unavailable.' }, { status: 503 })
  }
}
