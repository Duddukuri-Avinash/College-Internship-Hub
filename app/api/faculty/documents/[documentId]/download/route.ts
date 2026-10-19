import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const { documentId } = await params

  try {
    const response = await fetch(`${backendUrl}/faculty/documents/${encodeURIComponent(documentId)}/download`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      return NextResponse.json(result, { status: response.status })
    }
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
        'content-disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('Backend faculty document download failed:', error)
    return NextResponse.json({ error: 'Faculty document service is unavailable.' }, { status: 503 })
  }
}
