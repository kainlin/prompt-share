import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import type { UseMDXComponents } from 'nextra/mdx-components'
import { CaseHeader, PromptBlock, ImageGallery, CategoryGrid } from '@prompt-share/ui'

const docsComponents = getDocsMDXComponents()

export const useMDXComponents: UseMDXComponents<typeof docsComponents> = <T,>(
  components?: T
) => ({
  ...docsComponents,
  CaseHeader,
  PromptBlock,
  ImageGallery,
  CategoryGrid,
  ...components
})
