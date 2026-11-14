import Link from 'next/link'
import { LanguageSwitcher } from '@/components/consi/language-switcher'
import { Orb } from '@/components/consi/orb'

export const metadata = { title: 'CONSI Portal' }

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/portal" className="flex items-center gap-2 font-heading text-xl font-bold">
            <Orb size={36} />
            CONSI Portal
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="min-h-11 content-center rounded-full px-4 text-base font-medium ring-1 ring-border hover:bg-muted">
              Resident app
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
