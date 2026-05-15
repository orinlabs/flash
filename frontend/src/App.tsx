import { Loader2, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  apiGet,
  apiPost,
  type Campaign,
  type Person
} from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const [name, setName] = useState('My ICP run')
  const [icpDocument, setIcpDocument] = useState(
    'Describe your ideal customer profile here.'
  )
  const [targetCount, setTargetCount] = useState(10)

  const loadCampaigns = useCallback(async () => {
    setError(null)
    const data = await apiGet<Campaign[]>('/campaigns')
    setCampaigns(data)
  }, [])

  const loadPeople = useCallback(async () => {
    setPeopleLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ data: Person[] }>('/people?limit=25')
      setPeople(res.data)
    } finally {
      setPeopleLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadCampaigns()
        await loadPeople()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCampaigns, loadPeople])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await apiPost<Campaign>('/campaigns', {
        name,
        icpDocument,
        targetCount
      })
      await loadCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function startRun(campaignId: string) {
    setRunningId(campaignId)
    setError(null)
    try {
      await apiPost<{ workflowTriggered: boolean }>(
        `/campaigns/${campaignId}/runs`
      )
      await loadCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start run failed')
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="mx-auto min-h-svh max-w-5xl space-y-8 p-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          ICP Prospector
        </h1>
        <p className="text-muted-foreground text-sm">
          Campaigns and people (dev: API proxied from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api</code>).
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">Error</CardTitle>
            <CardDescription className="text-destructive/90">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New campaign</CardTitle>
            <CardDescription>
              Creates a row and optional Render Workflow run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icp">ICP document</Label>
                <Textarea
                  id="icp"
                  value={icpDocument}
                  onChange={(e) => setIcpDocument(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target count</Label>
                <Input
                  id="target"
                  type="number"
                  min={1}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  required
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create campaign'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>People</CardTitle>
              <CardDescription>Latest 25 from the database.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadPeople()}
              disabled={peopleLoading}
            >
              {peopleLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground text-center text-sm"
                    >
                      No people yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  people.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.fullName ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.lifecycleStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Start a run to invoke the Render Workflow stub.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadCampaigns()}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    <Loader2 className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground text-center text-sm"
                  >
                    No campaigns yet.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.targetCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={runningId === c.id}
                        onClick={() => void startRun(c.id)}
                      >
                        {runningId === c.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Play />
                        )}
                        <span className="ml-1">Run</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
