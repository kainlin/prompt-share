import { Footer, Layout, Navbar, LocaleSwitch } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import type { ReactNode } from 'react'
import { getDictionary } from '@prompt-share/i18n'
import { SITE_TITLE, SITE_DESCRIPTION } from '@prompt-share/ui'
import type { Metadata } from 'next'
import { Providers } from '@prompt-share/ui'
import 'nextra-theme-docs/style.css'
import '@prompt-share/styles/globals.css'

export const metadata: Metadata = {
  description: SITE_DESCRIPTION.zh,
  metadataBase: new URL('https://prompt-share.vercel.app'),
  title: {
    default: SITE_TITLE.zh,
    template: '%s | PromptShare'
  },
  appleWebApp: { title: 'PromptShare' },
  other: { 'msapplication-TileColor': '#fff' }
}

export default async function RootLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  const pageMap = await getPageMap('/' + lang)

  const navbar = (
    <Navbar
      logo={
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          ✨ {dictionary.siteName}
        </span>
      }
    >
      <LocaleSwitch lite />
    </Navbar>
  )

  const footer = (
    <Footer className="flex-col items-center md:items-start">
      <p className="mt-6 text-xs" style={{ color: 'var(--feishu-text-secondary)' }}>
        {dictionary.poweredBy} Nextra & Next.js
      </p>
    </Footer>
  )

  return (
    <html lang={lang} suppressHydrationWarning>
      <Head faviconGlyph="✨" />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          docsRepositoryBase="https://github.com/kainlin/prompt-share/tree/main"
          i18n={[
            { locale: 'zh', name: '中文' },
            { locale: 'en', name: 'English' }
          ]}
          sidebar={{ defaultMenuCollapseLevel: 1, autoCollapse: true }}
          editLink={dictionary.editPage}
          pageMap={pageMap}
          themeSwitch={{
            dark: dictionary.dark,
            light: dictionary.light,
            system: dictionary.system
          }}
        >
          <Providers>{children}</Providers>
        </Layout>
      </body>
    </html>
  )
}
