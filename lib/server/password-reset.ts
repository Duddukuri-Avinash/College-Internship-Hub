import { createHash } from 'node:crypto'

export const passwordResetCookieName = 'internhub_password_reset_token'

export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
