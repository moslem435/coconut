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

  // Action Sheet 渲染逻辑
  if (request.type === 'action-sheet') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={cancel}>
          <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[320px] bg-[#fcfcfc]/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl border border-[var(--os-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
          >
              {(request.title || request.message) && (
                  <div className="px-4 py-3 border-b border-[var(--os-border)] text-left bg-[var(--os-bg-panel)]/50">
                      {request.title && (
                          <h3 className="text-[13px] font-semibold text-[var(--os-text-primary)]">
                              {request.title}
                          </h3>
                      )}
                      {request.message && (
                          <p className="mt-1 text-[12px] text-[var(--os-text-secondary)]">
                              {request.message}
                          </p>
                      )}
                  </div>
              )}
              
              <div className="p-1 flex flex-col gap-0.5">
                  {request.options?.map((option, index) => {
                      if (option.isCancel) return null
                      return (
                        <button
                            key={index}
                            onClick={() => {
                                option.onClick()
                                cancel()
                            }}
                            className={`w-full px-3 py-2 text-[13px] text-left rounded-md transition-colors flex items-center gap-2 ${
                                option.isDestructive 
                                    ? 'text-red-500 hover:bg-red-500/10 active:bg-red-500/20' 
                                    : 'text-[var(--os-text-primary)] hover:bg-[var(--os-hover-bg)] active:bg-[var(--os-active-bg)]'
                            }`}
                        >
                            {option.label}
                        </button>
                      )
                  })}
              </div>
          </motion.div>
      </div>
    )
  }

  // 常规 Alert/Confirm/Prompt 渲染逻辑
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[320px] bg-[#fcfcfc] dark:bg-[#2c2c2e] rounded-xl shadow-2xl overflow-hidden text-center flex flex-col"
        >
            <div className="p-5 space-y-1">
                <h3 className="font-semibold text-[17px] leading-6 text-black dark:text-white">
                    {request.title}
                </h3>
                {request.message && (
                    <p className="text-[13px] leading-[18px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {request.message}
                    </p>
                )}
            </div>

            {request.type === 'prompt' && (
                <div className="px-4 pb-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={request.placeholder}
                        className="w-full px-2 py-1 bg-white dark:bg-[#1c1c1e] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-[4px] text-[13px] text-black dark:text-white placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                    />
                </div>
            )}
            
            <div className="flex border-t border-[#3d3d40]/30 divide-x divide-[#3d3d40]/30">
                {request.type !== 'alert' && (
                    <button 
                        onClick={cancel}
                        className="flex-1 py-3 text-[17px] text-[#007aff] dark:text-[#0a84ff] active:bg-gray-100 dark:active:bg-[#3a3a3c] transition-colors"
                    >
                        {t('common.cancel') || 'Cancel'}
                    </button>
                )}
                <button 
                    onClick={() => request.type === 'prompt' ? submit(inputValue) : submit()}
                    className={`flex-1 py-3 text-[17px] font-semibold text-[#007aff] dark:text-[#0a84ff] active:bg-gray-100 dark:active:bg-[#3a3a3c] transition-colors ${request.type === 'alert' ? 'w-full' : ''}`}
                >
                    {t('common.ok') || 'OK'}
                </button>
            </div>
        </motion.div>
    </div>
  )
}
