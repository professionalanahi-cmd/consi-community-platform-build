import { AppHeader } from '@/components/consi/app-header'
import { BottomNav } from '@/components/consi/bottom-nav'
import { ConciergeLauncher } from '@/components/consi/concierge/concierge-launcher'

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:bg-backdrop lg:p-6 xl:p-8">
      <div className="mx-auto flex min-h-dvh flex-col bg-background lg:min-h-[calc(100dvh-3rem)] lg:max-w-7xl lg:rounded-[2.5rem] lg:shadow-2xl xl:min-h-[calc(100dvh-4rem)]">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <AppHeader />
        <div className="flex flex-1 flex-col lg:flex-row">
          <BottomNav />
          <main id="main" className="flex min-w-0 flex-1 flex-col px-5 pb-8 pt-5 md:px-8 md:pt-6 lg:px-10 lg:pb-10 lg:pt-8 xl:px-12">
            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:max-w-3xl lg:max-w-none">{children}</div>
          </main>
        </div>
      </div>
      <ConciergeLauncher />
    </div>
  )
}
