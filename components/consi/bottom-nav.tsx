'use client'

import { Ellipsis, House, ListChecks, Settings } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useApp } from './app-provider'
import { Orb } from './orb'

const ITEMS = [
  { href: '/', key: 'nav.home', icon: House, guide: 'nav-home' },
  { href: '/results', key: 'nav.results', icon: ListChecks, guide: 'nav-results' },
  { href: '/settings', key: 'nav.settings', icon: Settings, guide: 'nav-settings' },
  { href: '/more', key: 'nav.more', icon: Ellipsis, guide: 'nav-more' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { t, setConciergeOpen } = useApp()
  return (
    <nav aria-label={t('nav.main')} className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {ITEMS.map(({ href, key, icon: Icon, guide }, i) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Fragment key={href}>
              {/* The concierge lives in the bar itself, so it never floats over page content. */}
              {i === 2 && (
                <li className="flex flex-none items-center px-1">
                  <button
                    type="button"
                    onClick={() => setConciergeOpen(true)}
                    aria-label={t('home.talk')}
                    className="flex size-14 items-center justify-center rounded-full bg-primary shadow-md outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Orb size={44} />
                  </button>
                </li>
              )}
            <li className="flex-1">
              <Link
                href={href}
                data-guide={guide}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.8rem] font-medium leading-tight transition-colors sm:text-sm',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-6" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
                {t(key)}
              </Link>
            </li>
            </Fragment>
          )
        })}
      </ul>
    </nav>
  )
}
