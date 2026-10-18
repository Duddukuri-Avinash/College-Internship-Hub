import { NextResponse, type NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8000'

async function forward(request: NextRequest, path: string[]) {
  const token = request.cookies.get('internhub_access_token')?.value
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const headers = new Headers({ authorization: `Bearer ${token}` })
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const response = await fetch(`${backendUrl}/api/github/${path.join('/')}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
    redirect: 'manual',
  })

  const location = response.headers.get('location')
  if (location) return NextResponse.redirect(location, response.status === 302 ? 302 : 307)
  const responseHeaders = new Headers()
  const responseContentType = response.headers.get('content-type')
  if (responseContentType) responseHeaders.set('content-type', responseContentType)
  return new NextResponse(response.body, { status: response.status, headers: responseHeaders })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path)
}
