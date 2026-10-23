export type NotificationCategory = 'applications' | 'experiences' | 'internships' | 'announcements' | 'questions' | 'account'

export type NotificationPreferences = {
  in_app_enabled: boolean | null
  email_enabled: boolean | null
  applications: boolean | null
  experiences: boolean | null
  internships: boolean | null
  announcements: boolean | null
  questions: boolean | null
  account: boolean | null
}

const categoryColumns: Record<NotificationCategory, keyof NotificationPreferences> = {
  applications: 'applications',
  experiences: 'experiences',
  internships: 'internships',
  announcements: 'announcements',
  questions: 'questions',
  account: 'account',
}

const authenticationNotificationTypes = new Set([
  'password_recovery',
  'password_reset',
  'login_otp',
  'verification_code',
  'email_verification',
])

export function notificationChannelEnabled(
  preferences: NotificationPreferences | undefined,
  category: NotificationCategory,
  channel: 'in_app_enabled' | 'email_enabled',
) {
  if (preferences?.[channel] === false) return false
  return preferences?.[categoryColumns[category]] !== false
}

export function isAuthenticationNotificationType(type: string) {
  return authenticationNotificationTypes.has(type.toLowerCase())
}

export function notificationDeliveryAllowed(
  type: string,
  preferences: NotificationPreferences | undefined,
  category: NotificationCategory,
  channel: 'in_app_enabled' | 'email_enabled',
) {
  return !isAuthenticationNotificationType(type) && notificationChannelEnabled(preferences, category, channel)
}

export function notificationOwnerMatches(notificationUserId: number, currentUserId: number) {
  return notificationUserId === currentUserId
}
