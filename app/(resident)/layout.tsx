import { BottomNav } from '@/components/consi/bottom-nav'
import { ConciergeLauncher } from '@/components/consi/concierge/concierge-launcher'

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:bg-backdrop lg:py-8">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-background lg:min-h-[calc(100dvh-4rem)] lg:overflow-hidden lg:rounded-[2.5rem] lg:shadow-2xl">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <main id="main" className="flex flex-1 flex-col px-5 pb-8 pt-6">
          {children}
        </main>
        <BottomNav />
      </div>
      <ConciergeLauncher />
    </div>
  )
}
