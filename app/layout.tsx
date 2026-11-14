import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Figtree, Lexend } from 'next/font/google'
import { AppProvider } from '@/components/consi/app-provider'
import './globals.css'

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' })
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })

export const metadata: Metadata = {
  title: 'CONSI — Your community concierge',
  description: 'Find local programs and support in Glendale, by typing, speaking, or talking with a voice guide. Available in English, Spanish, Armenian, and Mandarin.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f2efe9',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${lexend.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AppProvider>{children}</AppProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
