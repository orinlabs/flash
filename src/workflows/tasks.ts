import { task } from '@renderinc/sdk/workflows'

import { findPersonAgent, type FindPersonAgentResult } from './agent.js'
import {
  getCampaignDiscoveredPersonIds,
  getCampaignRunWithCampaign,
  markRunFailed,
  requiredEnv,
  updateCampaignStatusIfRunning,
  updateRunCheckpoint
} from './repo.js'

type SlotInput = {
  campaignRunId: string
  campaignId: string
  campaignName: string
  icpDocument: string
  slotIndex: number
  totalSlots: number
}

type SlotResult = {
  slotIndex: number
  result: FindPersonAgentResult
}

/**
 * One agent run = one task run = one attempt to add one net-new person.
 * Registered as a Render task so the orchestrator can fan out N copies and
 * each one shows up as its own task run in the Render workflow dashboard.
 */
export const findOneProspect = task(
  {
    name: 'findOneProspect',
    timeoutSeconds: 600,
    retry: { maxRetries: 1, waitDurationMs: 2000, backoffScaling: 2 }
  },
  async function findOneProspect(input: SlotInput): Promise<SlotResult> {
    const result = await findPersonAgent({
      campaignId: input.campaignId,
      campaignRunId: input.campaignRunId,
      campaignName: input.campaignName,
      icpDocument: input.icpDocument,
      slotIndex: input.slotIndex,
      totalSlots: input.totalSlots
    })
    return { slotIndex: input.slotIndex, result }
  }
)

/**
 * Orchestrator: for each missing slot up to targetCount, spawn one findOneProspect subtask.
 * Each subtask is its own LLM agent with progressive-disclosure DB + web tools.
 */
export const prospectCampaign = task(
  {
    name: 'prospectCampaign',
    timeoutSeconds: 3600,
    retry: { maxRetries: 1, waitDurationMs: 5000, backoffScaling: 2 }
  },
  async function prospectCampaign(campaignRunId: string): Promise<{
    qualifiedCount: number
    spawned: number
    found: number
    duplicates: number
    gaveUp: number
    errors: number
  }> {
    try {
      return await runProspectCampaign(campaignRunId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markRunFailed(campaignRunId, message)
      throw err
    }
  }
)

async function runProspectCampaign(campaignRunId: string): Promise<{
  qualifiedCount: number
  spawned: number
  found: number
  duplicates: number
  gaveUp: number
  errors: number
}> {
  requiredEnv('DATABASE_URL')
  requiredEnv('EXA_API_KEY')
  requiredEnv('OPENROUTER_API_KEY')

  const row = await getCampaignRunWithCampaign(campaignRunId)
  if (!row) {
    throw new Error(`campaign run not found: ${campaignRunId}`)
  }
  const { campaign } = row

  const targetCount = Math.max(1, campaign.targetCount)
  const alreadyIds = await getCampaignDiscoveredPersonIds(campaign.id)
  const startingQualified = alreadyIds.length
  const slotsNeeded = Math.max(0, targetCount - startingQualified)

  await updateRunCheckpoint(campaignRunId, {
    status: 'running',
    qualifiedCount: startingQualified,
    checkpoint: {
      phase: 'orchestrating',
      targetCount,
      startingQualified,
      slotsToSpawn: slotsNeeded
    },
    lastError: null
  })

  if (slotsNeeded === 0) {
    await updateRunCheckpoint(campaignRunId, {
      status: 'succeeded',
      qualifiedCount: startingQualified,
      checkpoint: {
        phase: 'done',
        targetCount,
        qualifiedCount: startingQualified,
        message: 'Target already met before run'
      }
    })
    await updateCampaignStatusIfRunning(campaign.id, 'completed')
    return {
      qualifiedCount: startingQualified,
      spawned: 0,
      found: 0,
      duplicates: 0,
      gaveUp: 0,
      errors: 0
    }
  }

  const slots: SlotInput[] = Array.from({ length: slotsNeeded }, (_, i) => ({
    campaignRunId,
    campaignId: campaign.id,
    campaignName: campaign.name,
    icpDocument: campaign.icpDocument,
    slotIndex: i,
    totalSlots: slotsNeeded
  }))

  // Fan out: each call to findOneProspect from a parent task is automatically
  // turned into a subtask run by the Render SDK.
  const settled = await Promise.allSettled(slots.map((s) => findOneProspect(s)))

  let found = 0
  let duplicates = 0
  let gaveUp = 0
  let errors = 0
  const foundIds = new Set<string>()
  const summaries: Array<Record<string, unknown>> = []

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    if (s.status === 'rejected') {
      errors += 1
      summaries.push({ slot: i, status: 'task_rejected', error: String(s.reason).slice(0, 200) })
      continue
    }
    const { result } = s.value
    switch (result.status) {
      case 'found':
        if (!foundIds.has(result.personId)) {
          foundIds.add(result.personId)
          found += 1
        } else {
          duplicates += 1
        }
        summaries.push({ slot: i, status: 'found', personId: result.personId, steps: result.steps })
        break
      case 'duplicate':
        duplicates += 1
        summaries.push({ slot: i, status: 'duplicate', personId: result.personId, steps: result.steps })
        break
      case 'no_candidate':
        gaveUp += 1
        summaries.push({ slot: i, status: 'no_candidate', reason: result.reason, steps: result.steps })
        break
      case 'error':
        errors += 1
        summaries.push({ slot: i, status: 'agent_error', error: result.error, steps: result.steps })
        break
    }
  }

  // Re-read for an accurate final count (slots may have caught dups via DB).
  const finalIds = await getCampaignDiscoveredPersonIds(campaign.id)
  const qualifiedCount = finalIds.length

  const finalStatus =
    qualifiedCount >= targetCount ? 'succeeded' : qualifiedCount > startingQualified ? 'partial' : 'partial'

  await updateRunCheckpoint(campaignRunId, {
    status: finalStatus,
    qualifiedCount,
    checkpoint: {
      phase: 'done',
      targetCount,
      qualifiedCount,
      spawned: slots.length,
      found,
      duplicates,
      gaveUp,
      errors,
      slots: summaries
    },
    lastError: null
  })

  await updateCampaignStatusIfRunning(
    campaign.id,
    finalStatus === 'succeeded' ? 'completed' : 'partial'
  )

  return {
    qualifiedCount,
    spawned: slots.length,
    found,
    duplicates,
    gaveUp,
    errors
  }
}
