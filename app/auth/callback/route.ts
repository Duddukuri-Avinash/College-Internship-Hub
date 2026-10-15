import { NextResponse, type NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get('next')
  const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/'
  return NextResponse.redirect(new URL(destination, request.url))
}
