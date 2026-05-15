import { useEffect, useState } from 'react'

import { apiGet, type Person } from '@/api'
import { buildCrawlPeopleListPath } from '@/lib/listFetchParams'

import type { DetailSelection, PagedResponse } from './types'

type UseDrawerPeopleParams = {
  detail: DetailSelection | null
  onError: (message: string) => void
}

export function useDrawerPeople({ detail, onError }: UseDrawerPeopleParams) {
  const [companyPeople, setCompanyPeople] = useState<Person[]>([])
  const [companyPeopleLoading, setCompanyPeopleLoading] = useState(false)
  const [crawlPeople, setCrawlPeople] = useState<Person[]>([])
  const [crawlPeopleLoading, setCrawlPeopleLoading] = useState(false)

  const companyId = detail?.type === 'company' ? detail.id : null
  const crawlId = detail?.type === 'crawl' ? detail.id : null

  useEffect(() => {
    if (!companyId) {
      setCompanyPeople([])
      setCompanyPeopleLoading(false)
      return
    }
    let cancelled = false
    setCompanyPeopleLoading(true)
    setCompanyPeople([])
    void apiGet<PagedResponse<Person>>('/people?company_id=' + companyId + '&limit=200&offset=0')
      .then((res) => {
        if (!cancelled) setCompanyPeople(res.data)
      })
      .catch((err) => {
        if (!cancelled) {
          setCompanyPeople([])
          onError(err instanceof Error ? err.message : 'Failed to load company people')
        }
      })
      .finally(() => {
        if (!cancelled) setCompanyPeopleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, onError])

  useEffect(() => {
    if (!crawlId) {
      setCrawlPeople([])
      setCrawlPeopleLoading(false)
      return
    }
    let cancelled = false
    setCrawlPeopleLoading(true)
    setCrawlPeople([])
    void apiGet<PagedResponse<Person>>(buildCrawlPeopleListPath(crawlId))
      .then((res) => {
        if (!cancelled) setCrawlPeople(res.data)
      })
      .catch((err) => {
        if (!cancelled) {
          setCrawlPeople([])
          onError(err instanceof Error ? err.message : 'Failed to load crawl people')
        }
      })
      .finally(() => {
        if (!cancelled) setCrawlPeopleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [crawlId, onError])

  return {
    companyPeople,
    companyPeopleLoading,
    crawlPeople,
    crawlPeopleLoading,
    setCrawlPeople
  }
}
