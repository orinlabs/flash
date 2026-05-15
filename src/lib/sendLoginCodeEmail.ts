import { Resend } from 'resend'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(code: string): string {
  return (
    '<p>Your Prospector verification code is:</p>' +
    '<p style="font-size:24px;font-weight:700;letter-spacing:0.2em;font-family:monospace">' +
    escapeHtml(code) +
    '</p>' +
    '<p>This code expires in 15 minutes. If you did not request it, you can ignore this message.</p>'
  )
}

export async function sendOrinlabsLoginCode(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL must be set to send sign-in codes')
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Your Prospector sign-in code',
    html: buildHtml(code)
  })
  if (error) {
    throw new Error(error.message)
  }
}
