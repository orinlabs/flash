import 'dotenv/config'

import { startSweepDueAccounts } from '../../lib/workflowTrigger.js'

async function main(): Promise<void> {
  const triggered = await startSweepDueAccounts()
  if (!triggered) {
    console.error(
      '[cron:sweep] startSweepDueAccounts returned false — set RENDER_API_KEY and RENDER_WORKFLOW_SLUG in this service'
    )
    process.exit(1)
  }
  console.log('[cron:sweep] sweepDueAccounts task dispatched')
}

main().catch((err) => {
  console.error('[cron:sweep] failed:', err)
  process.exit(1)
})
