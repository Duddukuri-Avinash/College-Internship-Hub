import nodemailer from 'nodemailer'

type EmailMessage = {
  to?: string | string[]
  bcc?: string[]
  subject: string
  text: string
  html?: string
}

function smtpTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, '')
  const from = process.env.SMTP_FROM

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be configured.')
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    }),
    from,
  }
}

export async function sendEmail(message: EmailMessage) {
  const { transporter, from } = smtpTransport()
  await transporter.sendMail({ ...message, from })
}

export async function sendBulkEmail(recipients: string[], message: Omit<EmailMessage, 'to' | 'bcc'>) {
  for (let offset = 0; offset < recipients.length; offset += 50) {
    const batch = recipients.slice(offset, offset + 50)
    await sendEmail({ ...message, bcc: batch })
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}
