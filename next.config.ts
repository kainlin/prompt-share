import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
  contentDirBasePath: '/',
  search: { codeblocks: false },
  unstable_shouldAddLocaleToLinks: true
})

export default withNextra({
  reactStrictMode: true,
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'zh'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wvzqfmvehnfdxjqcjjbb.supabase.co',
        pathname: '/storage/v1/object/public/prompt-images/**'
      }
    ]
  }
})
