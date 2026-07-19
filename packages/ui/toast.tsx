'use client'

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import styles from './toast.module.css'

type ToastContextValue = (message: string) => void

const ToastContext = createContext<ToastContextValue>(() => {})

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([])

  const showToast = useCallback((message: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.container}>
        {toasts.map(t => (
          <div key={t.id} className={styles.toast}>
            ✅ {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
