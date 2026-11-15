import { PortalHeader } from '@/components/consi/portal/portal-header'

export const metadata = { title: 'CONSI Portal' }

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <PortalHeader />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
