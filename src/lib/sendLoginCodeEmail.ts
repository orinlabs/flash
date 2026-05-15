import { Resend } from 'resend'

/** Used when `RESEND_FROM_EMAIL` is unset. Verify `donotreply.orinlabs.ai` at https://resend.com/domains */
const DEFAULT_RESEND_FROM = 'Flash <noreply@donotreply.orinlabs.ai>'

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
    '<p>Your Flash verification code is:</p>' +
    '<p style="font-size:24px;font-weight:700;letter-spacing:0.2em;font-family:monospace">' +
    escapeHtml(code) +
    '</p>' +
    '<p>This code expires in 15 minutes. If you did not request it, you can ignore this message.</p>'
  )
}

export async function sendOrinlabsLoginCode(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM
  if (!apiKey) {
    throw new Error('RESEND_API_KEY must be set to send sign-in codes')
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Your Flash sign-in code',
    html: buildHtml(code)
  })
  if (error) {
    throw new Error(error.message)
  }
}
