'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useToast } from './toast'
import styles from './prompt-block.module.css'

interface PromptBlockProps {
  children: string
  label?: string
  emoji?: string
  copyDisabled?: boolean
}

interface ParsedArgument {
  raw: string
  name: string
  defaultValue: string
  index: number
}

// 1. Old syntax: {argument name="..." default="..."}
const ARG_REGEX_OLD = /\{argument\s+name=\\?"((?:[^"\\]|\\.)*)\\?"\s+default=\\?"((?:[^"\\]|\\.)*)\\?"\}/g
// 2. New syntax: {variable_name:default_value} or {variable_name}
const ARG_REGEX_NEW = /\{([a-zA-Z0-9_-]+)(?::([^}]+))?\}/g

function parseArguments(text: string): ParsedArgument[] {
  const found: ParsedArgument[] = []

  // 1. Match old syntax first
  let match
  ARG_REGEX_OLD.lastIndex = 0
  while ((match = ARG_REGEX_OLD.exec(text)) !== null) {
    found.push({
      raw: match[0],
      name: match[1],
      defaultValue: match[2],
      index: match.index
    })
  }

  // 2. Match new syntax
  ARG_REGEX_NEW.lastIndex = 0
  while ((match = ARG_REGEX_NEW.exec(text)) !== null) {
    const raw = match[0]
    if (raw.startsWith('{argument')) continue

    found.push({
      raw,
      name: match[1],
      defaultValue: match[2] || '',
      index: match.index
    })
  }

  // Sort by index to maintain appearance order
  found.sort((a, b) => a.index - b.index)
  return found
}

export function PromptBlock({
  children,
  label = 'Prompt',
  emoji = '✍️',
  copyDisabled = false
}: PromptBlockProps) {
  const showToast = useToast()

  // Parse arguments from template
  const args = useMemo(() => parseArguments(children), [children])

  // Initialize input state
  const initialValues = useMemo(() => {
    const vals: Record<string, string> = {}
    args.forEach(arg => {
      if (!(arg.name in vals)) {
        vals[arg.name] = arg.defaultValue
      }
    })
    return vals
  }, [args])

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [activeParam, setActiveParam] = useState<string | null>(null)

  // Create refs to focus inputs
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})

  // Reset to defaults
  const handleReset = useCallback(() => {
    setValues(initialValues)
  }, [initialValues])

  // Has any value changed?
  const isModified = useMemo(() => {
    return Object.keys(values).some(key => values[key] !== initialValues[key])
  }, [values, initialValues])

  // Compile prompt (substitute user values or default fallbacks)
  const compiledPrompt = useMemo(() => {
    let result = children
    args.forEach(arg => {
      const val = values[arg.name] !== undefined && values[arg.name] !== '' ? values[arg.name] : arg.defaultValue
      result = result.replaceAll(arg.raw, val)
    })
    return result
  }, [children, args, values])

  // Copy compiled
  const handleCopyCompiled = useCallback(() => {
    if (copyDisabled) {
      showToast('已为你锁定关键参数，订阅后即可免去手抄、一键复制运行。')
      return
    }
    navigator.clipboard.writeText(compiledPrompt).then(
      () => showToast('已复制定制提示词！'),
      () => showToast('复制失败，请重试')
    )
  }, [compiledPrompt, copyDisabled, showToast])

  // Copy raw template
  const handleCopyRaw = useCallback(() => {
    if (copyDisabled) {
      showToast('已为你锁定关键参数，订阅后即可免去手抄、一键复制运行。')
      return
    }
    navigator.clipboard.writeText(children).then(
      () => showToast('已复制原始模板！'),
      () => showToast('复制失败，请重试')
    )
  }, [children, copyDisabled, showToast])

  // Input change handler
  const handleInputChange = (name: string, val: string) => {
    setValues(prev => ({ ...prev, [name]: val }))
  }

  // Highlight pill click -> focus input
  const handlePillClick = (name: string) => {
    setActiveParam(name)
    const ref = inputRefs.current[name]
    if (ref) {
      ref.focus()
      ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // Format comma-separated prompt tokens for interactive hover effect
  const renderFormattedPrompt = (text: string) => {
    const trimmed = text.trim()
    const isJson = trimmed.startsWith('{') && trimmed.endsWith('}')

    if (isJson) {
      return <span>{text}</span>
    }

    const parts = text.split(',')
    if (parts.length <= 2) {
      return <span>{text}</span>
    }

    return parts.map((part, index) => {
      const isLast = index === parts.length - 1
      const trimmedPart = part.trim()
      if (!trimmedPart) return null

      const leadingSpace = part.startsWith(' ') || part.startsWith('\n') ? ' ' : ''
      const trailingSpace = part.endsWith(' ') ? ' ' : ''

      return (
        <span key={index}>
          {leadingSpace}
          <span 
            className={styles.promptToken}
            title="提示词修饰符 (Modifier)"
          >
            {trimmedPart}
          </span>
          {!isLast && <span className={styles.promptComma}>,</span>}
          {trailingSpace}
        </span>
      )
    })
  }

  // If no arguments, fallback to normal block
  if (args.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.label}>
            <span className={styles.emoji}>{emoji}</span>
            {label}
          </span>
          <button type="button" className={styles.copyBtn} onClick={handleCopyRaw}>
            📋 Copy
          </button>
        </div>
        <div className={styles.content}>{renderFormattedPrompt(children)}</div>
      </div>
    )
  }

  // Render Preview with clickable highlights
  const renderPreview = () => {
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let keyIdx = 0

    args.forEach(arg => {
      const matchIndex = arg.index
      const name = arg.name
      const rawText = arg.raw

      // Add text before match
      if (matchIndex > lastIndex) {
        elements.push(<span key={`text-${keyIdx++}`}>{children.slice(lastIndex, matchIndex)}</span>)
      }

      // Add pill
      const currentValue = values[name] !== undefined && values[name] !== '' ? values[name] : arg.defaultValue
      elements.push(
        <span
          key={`pill-${keyIdx++}`}
          className={`${styles.highlightPill} ${activeParam === name ? styles.activePill : ''}`}
          onClick={() => handlePillClick(name)}
          title={`点击定位参数: ${name}`}
        >
          {currentValue || `[请输入 ${name}]`}
        </span>
      )

      lastIndex = matchIndex + rawText.length
    })

    // Add trailing text
    if (lastIndex < children.length) {
      elements.push(<span key={`text-${keyIdx++}`}>{children.slice(lastIndex)}</span>)
    }

    return elements
  }

  return (
    <div className={styles.editorCard}>
      {/* Editor Header */}
      <div className={styles.editorHeader}>
        <div className={styles.editorLabel}>
          <span className={styles.emoji}>{emoji}</span>
          <span>{label} (提示词编辑器)</span>
        </div>
        <div className={styles.editorActions}>
          {isModified && (
            <button type="button" className={styles.resetBtn} onClick={handleReset}>
              🔄 重置
            </button>
          )}
          <button type="button" className={styles.rawBtn} onClick={handleCopyRaw}>
            📄 复制模板
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleCopyCompiled}>
            📋 复制生成词
          </button>
        </div>
      </div>

      {/* Editor Layout Grid */}
      <div className={styles.editorLayout}>
        {/* Form Panel */}
        <div className={styles.formPanel}>
          <h4 className={styles.panelTitle}>参数配置</h4>
          <div className={styles.formList}>
            {Object.keys(initialValues).map(name => {
              const isLongText = initialValues[name].length > 30
              return (
                <div
                  key={name}
                  className={`${styles.formItem} ${activeParam === name ? styles.activeFormItem : ''}`}
                >
                  <label className={styles.fieldLabel}>{name}</label>
                  {isLongText ? (
                    <textarea
                      ref={el => { inputRefs.current[name] = el }}
                      value={values[name] || ''}
                      onChange={e => handleInputChange(name, e.target.value)}
                      onFocus={() => setActiveParam(name)}
                      onBlur={() => setActiveParam(null)}
                      className={styles.fieldTextarea}
                      rows={3}
                      placeholder={`请输入 ${name}...`}
                    />
                  ) : (
                    <input
                      ref={el => { inputRefs.current[name] = el }}
                      type="text"
                      value={values[name] || ''}
                      onChange={e => handleInputChange(name, e.target.value)}
                      onFocus={() => setActiveParam(name)}
                      onBlur={() => setActiveParam(null)}
                      className={styles.fieldInput}
                      placeholder={`请输入 ${name}...`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Preview Panel */}
        <div className={styles.previewPanel}>
          <h4 className={styles.panelTitle}>提示词实时预览</h4>
          <div className={styles.previewContainer}>
            <div className={styles.previewContent}>
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
