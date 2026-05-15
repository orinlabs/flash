import { Render } from '@renderinc/sdk'

/**
 * Dispatches `prospectCampaign` on the Render Workflow service.
 * `RENDER_WORKFLOW_SLUG` is the **workflow service name** from the dashboard (not the repo name).
 * Task full slug: `${RENDER_WORKFLOW_SLUG}/prospectCampaign`
 */
export async function startProspectWorkflow(campaignRunId: string): Promise<boolean> {
  const token = process.env.RENDER_API_KEY
  const workflowService = process.env.RENDER_WORKFLOW_SLUG
  if (!token || !workflowService) {
    return false
  }

  const render = new Render({ token })
  const taskSlug = `${workflowService}/prospectCampaign`
  await render.workflows.startTask(taskSlug, [campaignRunId])
  return true
}
