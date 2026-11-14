'use client'

import { Ellipsis, House, ListChecks, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useApp } from './app-provider'

const ITEMS = [
  { href: '/', key: 'nav.home', icon: House, guide: 'nav-home' },
  { href: '/results', key: 'nav.results', icon: ListChecks, guide: 'nav-results' },
  { href: '/settings', key: 'nav.settings', icon: Settings, guide: 'nav-settings' },
  { href: '/more', key: 'nav.more', icon: Ellipsis, guide: 'nav-more' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useApp()
  return (
    <nav aria-label={t('nav.main')} className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {ITEMS.map(({ href, key, icon: Icon, guide }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                data-guide={guide}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-medium transition-colors',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-6" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
