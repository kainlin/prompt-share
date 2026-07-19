'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useToast } from './toast'
import styles from './prompt-block.module.css'

interface PromptBlockProps {
  children: string
  label?: string
  emoji?: string
}

interface ParsedArgument {
  raw: string
  name: string
  defaultValue: string
}

// Regex to find {argument name="..." default="..."} supporting optional backslashes before quotes
const ARG_REGEX = /\{argument\s+name=\\?"((?:[^"\\]|\\.)*)\\?"\s+default=\\?"((?:[^"\\]|\\.)*)\\?"\}/g

export function PromptBlock({
  children,
  label = 'Prompt',
  emoji = '✍️'
}: PromptBlockProps) {
  const showToast = useToast()

  // 1. Parse arguments from template
  const args = useMemo(() => {
    const found: ParsedArgument[] = []
    let match
    // Reset regex index
    ARG_REGEX.lastIndex = 0
    while ((match = ARG_REGEX.exec(children)) !== null) {
      found.push({
        raw: match[0],
        name: match[1],
        defaultValue: match[2]
      })
    }
    return found
  }, [children])

  // 2. Initialize input state
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

  // 3. Compile prompt (substitute user values)
  const compiledPrompt = useMemo(() => {
    let result = children
    args.forEach(arg => {
      const val = values[arg.name] !== undefined ? values[arg.name] : arg.defaultValue
      result = result.replaceAll(arg.raw, val)
    })
    return result
  }, [children, args, values])

  // Copy compiled
  const handleCopyCompiled = useCallback(() => {
    navigator.clipboard.writeText(compiledPrompt).then(
      () => showToast('已复制定制提示词！'),
      () => showToast('复制失败，请重试')
    )
  }, [compiledPrompt, showToast])

  // Copy raw template
  const handleCopyRaw = useCallback(() => {
    navigator.clipboard.writeText(children).then(
      () => showToast('已复制原始模板！'),
      () => showToast('复制失败，请重试')
    )
  }, [children, showToast])

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
        <div className={styles.content}>{children}</div>
      </div>
    )
  }

  // 4. Render Preview with clickable highlights
  const renderPreview = () => {
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    ARG_REGEX.lastIndex = 0
    let match
    let keyIdx = 0

    while ((match = ARG_REGEX.exec(children)) !== null) {
      const matchIndex = match.index
      const name = match[1]
      const rawText = match[0]

      // Add text before match
      if (matchIndex > lastIndex) {
        elements.push(<span key={`text-${keyIdx++}`}>{children.slice(lastIndex, matchIndex)}</span>)
      }

      // Add pill
      const currentValue = values[name] !== undefined ? values[name] : match[2]
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
    }

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
