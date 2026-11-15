import { Brand } from './brand'
import { LanguageSelector } from './language-selector'
import { UpdatesBell } from './updates-bell'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:rounded-t-[2.5rem]">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 md:px-8 lg:pl-4 lg:pr-6 xl:pl-5 xl:pr-7">
        <Brand />
        <div className="flex items-center gap-2">
          <UpdatesBell />
          <LanguageSelector />
        </div>
      </div>
    </header>
  )
}
