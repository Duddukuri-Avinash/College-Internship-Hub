import { NextResponse, type NextRequest } from 'next/server'

type RecoveryRole = 'student' | 'faculty' | 'admin'

export async function POST(request: NextRequest) {
  let input: { identifier?: unknown; role?: unknown }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid recovery request.' }, { status: 400 })
  }

  const identifier = typeof input.identifier === 'string' ? input.identifier.trim() : ''
  const role = input.role
  if (!identifier || identifier.length > 254 ||
      (role !== 'student' && role !== 'faculty' && role !== 'admin')) {
    return NextResponse.json({ error: 'Enter your registered sign-in ID.' }, { status: 400 })
  }

  console.warn('Password recovery requested but no SMTP provider is configured:', { identifier, role })
  return NextResponse.json({ error: 'Password recovery email is not configured for the SQL Server backend.' }, { status: 503 })
}
