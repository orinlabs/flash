import { eq } from 'drizzle-orm'
import { task } from '@renderinc/sdk/workflows'

import { db } from '../db/client.js'
import { campaignRuns, campaigns } from '../db/schema.js'

/**
 * Root prospecting task (stub): advances run state and completes the campaign.
 * Replace body with Exa + LLM tool loop and upserts into `people`.
 */
export const prospectCampaign = task(
  {
    name: 'prospectCampaign',
    timeoutSeconds: 3600,
    retry: { maxRetries: 2, waitDurationMs: 2000, backoffScaling: 2 }
  },
  async function prospectCampaign(campaignRunId: string): Promise<{ qualifiedCount: number }> {
    const [run] = await db.select().from(campaignRuns).where(eq(campaignRuns.id, campaignRunId))
    if (!run) {
      throw new Error(`campaign run not found: ${campaignRunId}`)
    }

    await db
      .update(campaignRuns)
      .set({ status: 'running', checkpoint: { step: 'stub_agent' }, updatedAt: new Date() })
      .where(eq(campaignRuns.id, campaignRunId))

    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, run.campaignId))
    if (!campaign) {
      throw new Error(`campaign missing for run ${campaignRunId}`)
    }

    // Stub: zero net-new people; real implementation chains tool calls here.
    await db
      .update(campaignRuns)
      .set({
        status: 'succeeded',
        qualifiedCount: 0,
        checkpoint: { phase: 'stub', message: 'Wire Exa/OpenAI + upsert_person tools here' },
        lastError: null,
        updatedAt: new Date()
      })
      .where(eq(campaignRuns.id, campaignRunId))

    await db
      .update(campaigns)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(campaigns.id, campaign.id))

    return { qualifiedCount: 0 }
  }
)
