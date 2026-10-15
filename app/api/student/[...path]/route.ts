import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

async function forward(request: NextRequest, path: string[]) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const headers = new Headers()
  headers.set('authorization', `Bearer ${token}`)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const response = await fetch(`${backendUrl}/students/${path.join('/')}`, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  })

  const responseHeaders = new Headers()
  const responseContentType = response.headers.get('content-type')
  if (responseContentType) responseHeaders.set('content-type', responseContentType)
  const contentDisposition = response.headers.get('content-disposition')
  if (contentDisposition) responseHeaders.set('content-disposition', contentDisposition)

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}
