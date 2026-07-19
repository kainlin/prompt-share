import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import type { UseMDXComponents } from 'nextra/mdx-components'
import { CaseHeader, PromptBlock, ImageGallery, CategoryGrid, CasePageLayout } from '@prompt-share/ui'

const docsComponents = getDocsMDXComponents()

export const useMDXComponents: UseMDXComponents<typeof docsComponents> = <T,>(
  components?: T
) => ({
  ...docsComponents,
  CaseHeader,
  PromptBlock,
  ImageGallery,
  CategoryGrid,
  wrapper: ({ children, ...props }: any) => {
    const metadata = props.metadata || {}
    const isCasePage = !!metadata.category
    const NextraWrapper = docsComponents.wrapper || (({ children }: any) => <>{children}</>)

    if (isCasePage) {
      return (
        <NextraWrapper {...props}>
          <CasePageLayout metadata={metadata} {...props}>
            {children}
          </CasePageLayout>
        </NextraWrapper>
      )
    }

    return <NextraWrapper {...props}>{children}</NextraWrapper>
  },
  ...components
})
