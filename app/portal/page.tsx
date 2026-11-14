import { RoleChooser } from '@/components/consi/portal/role-chooser'
import { db } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export default function Page() {
  const providers = [...db.providers.values()].map((p) => ({ id: p.id, name: p.name, status: p.status }))
  return <RoleChooser providers={providers} />
}
