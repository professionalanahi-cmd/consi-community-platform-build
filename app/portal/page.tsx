import { RoleChooser } from '@/components/consi/portal/role-chooser'
import { data } from '@/lib/server/data'
import { hydrateOrgs } from '@/lib/server/live'

export const dynamic = 'force-dynamic'

export default async function Page() {
  await hydrateOrgs()
  const providers = (await data.providers.list()).map((p) => ({ id: p.id, name: p.name, status: p.status }))
  return <RoleChooser providers={providers} />
}
