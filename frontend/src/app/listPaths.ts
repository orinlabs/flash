import type { CompaniesTableFetchParams, PeopleTableFetchParams } from '@/lib/listFetchParams'

import type { PeopleCrawlFilter } from './types'

export function buildPeoplePath(
  offset: number,
  crawlFilter: PeopleCrawlFilter | null,
  list: PeopleTableFetchParams,
  limit: number
): string {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (crawlFilter?.campaignId) params.set('campaign_id', crawlFilter.campaignId)
  if (crawlFilter?.campaignRunId) params.set('campaign_run_id', crawlFilter.campaignRunId)
  const q = list.q?.trim()
  if (q) params.set('q', q)
  if (list.lifecycle) params.set('lifecycle', list.lifecycle)
  if (list.companyId) params.set('company_id', list.companyId)
  else if (list.companyScope) params.set('company_scope', list.companyScope)
  if (list.hasEmail) params.set('has_email', list.hasEmail)
  if (list.hasLinkedin) params.set('has_linkedin', list.hasLinkedin)
  return '/people?' + params.toString()
}

export function buildCompaniesPath(
  offset: number,
  list: CompaniesTableFetchParams,
  limit: number
): string {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const q = list.q?.trim()
  if (q) params.set('q', q)
  if (list.outreachStatus) params.set('outreach_status', list.outreachStatus)
  if (list.mailboxId) params.set('mailbox_id', list.mailboxId)
  else if (list.mailboxScope === 'assigned') params.set('has_mailbox', 'true')
  else if (list.mailboxScope === 'unassigned') params.set('has_mailbox', 'false')
  if (list.hasPeople) params.set('has_people', list.hasPeople)
  if (list.pendingDrafts) params.set('pending_drafts', list.pendingDrafts)
  return '/companies?' + params.toString()
}
