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

/** One navigation, two shapes: a bottom tab bar on phones and tablets, a side rail on laptops and desktops. */
export function BottomNav() {
  const pathname = usePathname()
  const { t } = useApp()
  return (
    <nav
      aria-label={t('nav.main')}
      className="sticky bottom-0 z-30 order-last border-t border-border bg-background/95 backdrop-blur lg:static lg:z-auto lg:order-none lg:w-60 lg:shrink-0 lg:border-r lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none xl:w-64"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around gap-0.5 px-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:max-w-2xl lg:sticky lg:top-6 lg:mx-0 lg:max-w-none lg:flex-col lg:justify-start lg:gap-1.5 lg:p-4 xl:top-8 xl:p-5">
        {/* Rendered twice so tab order always matches what is on screen: first in the rail, centered in the bar. */}
        <TalkItem className="hidden lg:mb-3 lg:flex" />
        {ITEMS.map(({ href, key, icon: Icon, guide }, i) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Fragment key={href}>
              {/* The concierge lives in the bar itself, so it never floats over page content. */}
              {i === 2 && <TalkItem className="flex lg:hidden" />}
              <li className="min-w-0 flex-1 lg:flex-none">
                <Link
                  href={href}
                  data-guide={guide}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[0.7rem] font-medium leading-tight transition-colors min-[400px]:text-[0.8rem] sm:text-sm lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base',
                    active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-6 shrink-0" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
                  <span className="max-w-full truncate">{t(key)}</span>
                </Link>
              </li>
            </Fragment>
          )
        })}
      </ul>
    </nav>
  )
}

function TalkItem({ className }: { className: string }) {
  const { t, setConciergeOpen } = useApp()
  return (
    <li className={cn('flex-none items-center px-1 lg:px-0', className)}>
      <button
        type="button"
        onClick={() => setConciergeOpen(true)}
        aria-label={t('home.talk')}
        className="flex size-14 items-center justify-center rounded-full bg-primary shadow-md outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring lg:h-auto lg:min-h-14 lg:w-full lg:justify-start lg:gap-3 lg:py-1.5 lg:pl-1.5 lg:pr-5 lg:text-left lg:text-base lg:font-semibold lg:leading-tight lg:text-primary-foreground"
      >
        <Orb size={44} className="shrink-0" />
        <span className="hidden lg:block">{t('home.talk')}</span>
      </button>
    </li>
  )
}
