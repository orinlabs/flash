import { useEffect, useState } from 'react'

import { apiGet, type Company, type Person } from '@/api'

import type { PagedResponse } from './types'

const PALETTE_RECORD_LIMIT = 40

type UsePaletteRecordSearchParams = {
  open: boolean
  query: string
  onError: (message: string) => void
}

export function usePaletteRecordSearch({
  open,
  query,
  onError
}: UsePaletteRecordSearchParams) {
  const [people, setPeople] = useState<Person[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setPeople([])
      setCompanies([])
      return
    }
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setLoading(false)
      setPeople([])
      setCompanies([])
      return
    }

    setLoading(true)
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      const q = encodeURIComponent(trimmed)
      void Promise.all([
        apiGet<PagedResponse<Person>>(
          '/people?limit=' + String(PALETTE_RECORD_LIMIT) + '&offset=0&q=' + q,
          { signal: ac.signal }
        ),
        apiGet<PagedResponse<Company>>(
          '/companies?limit=' + String(PALETTE_RECORD_LIMIT) + '&offset=0&q=' + q,
          { signal: ac.signal }
        )
      ])
        .then(([pe, co]) => {
          if (ac.signal.aborted) return
          setPeople(pe.data)
          setCompanies(co.data)
        })
        .catch((err) => {
          if (ac.signal.aborted) return
          setPeople([])
          setCompanies([])
          onError(err instanceof Error ? err.message : 'Command palette search failed')
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, 260)

    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [open, query, onError])

  return { people, companies, loading }
}
