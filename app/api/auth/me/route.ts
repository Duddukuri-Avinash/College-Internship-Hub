import { NextResponse, type NextRequest } from 'next/server'

import { authenticate } from '@/lib/server/auth'
import { apiErrorResponse } from '@/lib/server/http'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    return NextResponse.json({
      profile: {
        id: String(user.id),
        email: user.email,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role,
        status: 'active',
        first_login: user.is_first_login,
      },
    })
  } catch (error) {
    return apiErrorResponse(error, 'Next.js session lookup failed')
  }
}
