import 'server-only'
import { demoProvider } from './demo-provider'
import type { DataProvider } from './types'

/**
 * The single entry point for application data.
 *
 * Only the demo provider exists today. To add a database, implement
 * `DataProvider` (for example in `postgres-provider.ts`), add it here, and
 * set CONSI_DATA_PROVIDER. No route or component needs to change.
 */
function selectProvider(): DataProvider {
  const name = process.env.CONSI_DATA_PROVIDER ?? 'demo'
  if (name === 'demo') return demoProvider
  throw new Error(`Unknown CONSI_DATA_PROVIDER "${name}". Only "demo" is available.`)
}

export const data: DataProvider = selectProvider()

export { newId } from './ids'
export type * from './types'
