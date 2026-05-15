/** Debounce before hitting `/people` and `/companies` `q=` from table search boxes. */
export const TABLE_SEARCH_DEBOUNCE_MS = 320

const CRAWL_PEOPLE_LIST_LIMIT = 200

/** People discovered by a crawl or a single crawl run (drawer / run cards). */
export function buildCrawlPeopleListPath(
  campaignId: string,
  campaignRunId?: string | null,
  limit = CRAWL_PEOPLE_LIST_LIMIT
): string {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', '0')
  params.set('campaign_id', campaignId)
  if (campaignRunId) params.set('campaign_run_id', campaignRunId)
  return '/people?' + params.toString()
}

export type PeopleTableFetchParams = {
  q?: string
  lifecycle?: string
  companyId?: string
  companyScope?: 'assigned' | 'unassigned'
  hasEmail?: 'true' | 'false'
  hasLinkedin?: 'true' | 'false'
}

export type CompaniesTableFetchParams = {
  q?: string
  outreachStatus?: 'dormant' | 'working' | 'paused' | 'completed' | 'dead'
  mailboxId?: string
  mailboxScope?: 'assigned' | 'unassigned'
  hasPeople?: 'true' | 'false'
  pendingDrafts?: 'true' | 'false'
}
