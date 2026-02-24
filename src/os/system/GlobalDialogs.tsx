import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { X } from 'lucide-react'

export default function GlobalDialogs() {
  const { request, submit, cancel } = useDialogStore()
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (request?.type === 'prompt') {
      setInputValue(request.defaultValue || '')
      // Focus after render
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [request])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (request?.type === 'prompt') submit(inputValue)
      else submit()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (!request) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-[var(--os-bg-window)]/90 backdrop-blur-xl border border-[var(--os-border)] rounded-xl shadow-2xl overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--os-border)] bg-[var(--os-bg-panel)]/50">
                <span className="font-medium text-[var(--os-text-primary)]">{request.title}</span>
                <button onClick={cancel} className="text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)] transition-colors">
                    <X size={16} />
                </button>
            </div>
            
            <div className="p-4 space-y-4">
                {request.message && (
                    <p className="text-sm text-[var(--os-text-secondary)] whitespace-pre-wrap">{request.message}</p>
                )}

                {request.type === 'prompt' && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={request.placeholder}
                        className="w-full px-3 py-2 bg-[var(--os-bg-input)] border border-[var(--os-border)] rounded-md text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-[var(--os-accent)] focus:ring-1 focus:ring-[var(--os-accent)] transition-all"
                    />
                )}

                <div className="flex justify-end gap-2 pt-2">
                    {request.type !== 'alert' && (
                        <button 
                            onClick={cancel}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] rounded-md transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    )}
                    <button 
                        onClick={() => request.type === 'prompt' ? submit(inputValue) : submit()}
                        className="px-3 py-1.5 text-xs font-medium bg-[var(--os-accent)] hover:bg-[var(--os-accent-dim)] text-white rounded-md transition-colors shadow-lg shadow-[var(--os-accent)]/20"
                    >
                        {t('common.ok')}
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
  )
}
