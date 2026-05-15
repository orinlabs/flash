export type DetailSelection =
  | { type: 'person'; id: string }
  | { type: 'company'; id: string }
  | { type: 'crawl'; id: string }

export type PeopleCrawlFilter = {
  campaignId: string
  campaignRunId: string | null
}

export type PagedResponse<T> = { data: T[]; limit: number; offset: number }

export type AgenticPeopleSearchResponse = {
  selectedPersonIds: string[]
  errors: Array<{ personId: string; error: string }>
}

export type AgenticCompanySearchResponse = {
  selectedCompanyIds: string[]
  errors: Array<{ companyId: string; error: string }>
}

export type AgenticPeopleSearchStreamEvent =
  | { type: 'start'; total: number }
  | {
      type: 'result'
      result: { personId: string; fits: boolean; error?: string }
    }
  | AgenticPeopleSearchResponse & { type: 'done' }

export type AgenticCompanySearchStreamEvent =
  | { type: 'start'; total: number }
  | {
      type: 'result'
      result: { companyId: string; fits: boolean; error?: string }
    }
  | AgenticCompanySearchResponse & { type: 'done' }
