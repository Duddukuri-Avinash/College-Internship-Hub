import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ status: 'signed_out' })
  response.cookies.set('internhub_access_token', '', { httpOnly: true, expires: new Date(0), path: '/' })
  return response
}
