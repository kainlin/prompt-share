import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from '@prompt-share/ui'
import '@prompt-share/styles/globals.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'PromptShare Cloud — AI Prompt Monetization',
  description: 'Turn your AI image prompts into a subscription business.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
