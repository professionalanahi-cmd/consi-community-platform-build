'use client'

import { Baby, Briefcase, Bus, GraduationCap, HeartPulse, Home, Lightbulb, Music, Scale, ShoppingBasket, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Category } from '@/lib/types'
import { useApp } from '../app-provider'

const CATEGORY_ICONS: Record<Category, typeof Music> = {
  arts_music: Music,
  food: ShoppingBasket,
  utilities: Lightbulb,
  jobs: Briefcase,
  housing: Home,
  health: HeartPulse,
  youth_childcare: Baby,
  education: GraduationCap,
  legal: Scale,
  transportation: Bus,
  seniors: Users,
}

const EXAMPLES = ['home.ex1', 'home.ex2', 'home.ex3', 'home.ex4'] as const

export function QuickStarts() {
  const { t, startSearch } = useApp()
  const router = useRouter()
  const go = (q: string) => {
    startSearch(q)
    router.push('/results')
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="examples-heading" className="flex flex-col gap-3">
        <h2 id="examples-heading" className="text-base font-semibold text-muted-foreground">
          {t('home.examples')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLES.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => go(t(k))}
                className="min-h-12 rounded-full bg-card px-4 text-left text-base ring-1 ring-border hover:bg-accent"
              >
                {`“${t(k)}”`}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="browse-heading" className="flex flex-col gap-3">
        <h2 id="browse-heading" className="text-base font-semibold text-muted-foreground">
          {t('home.browse')}
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(CATEGORY_ICONS) as Category[]).map((c) => {
            const Icon = CATEGORY_ICONS[c]
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => go(t(`cat.${c}`))}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left text-base font-medium ring-1 ring-border hover:bg-accent"
                >
                  <Icon className="size-5 shrink-0 text-mint" aria-hidden="true" />
                  {t(`cat.${c}`)}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
