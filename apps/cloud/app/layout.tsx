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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
