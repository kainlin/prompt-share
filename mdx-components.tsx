import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import type { UseMDXComponents } from 'nextra/mdx-components'
import { CaseHeader } from './components/case-header'
import { PromptBlock } from './components/prompt-block'
import { ImageGallery } from './components/image-gallery'
import { CategoryGrid } from './components/category-grid'

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
