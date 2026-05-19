const LOGO_FETCH_TIMEOUT_MS = 2500

function companyHost(domain: string | null | undefined): string | null {
  const cleaned = domain?.trim()
  if (!cleaned) return null
  return (
    cleaned
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .toLowerCase() || null
  )
}

/** Google favicon service — same source the frontend already used at render time. */
export function logoUrlForDomain(domain: string | null | undefined): string | null {
  const host = companyHost(domain)
  if (!host) return null
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
}

export function logoUrlForCompany(input: {
  domain?: string | null
  website?: string | null
}): string | null {
  return logoUrlForDomain(input.domain ?? input.website)
}

async function logoCandidateOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS)
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Picks the first reachable favicon/logo URL for a company host, falling back to Google.
 */
export async function resolveCompanyLogoUrl(
  domain: string | null | undefined,
  website?: string | null | undefined
): Promise<string | null> {
  const host = companyHost(domain ?? website)
  if (!host) return null

  const google = logoUrlForDomain(host)
  const candidates = [
    google,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
    `https://logo.clearbit.com/${encodeURIComponent(host)}`
  ].filter((url): url is string => Boolean(url))

  for (const url of candidates) {
    if (await logoCandidateOk(url)) return url
  }
  return google
}
