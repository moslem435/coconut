/**
 * @fileoverview 全局对话框组件 - 渲染全局模态对话框 UI
 * 
 * 为什么单独抽离对话框 UI 而非内嵌到业务组件：
 * - 对话框需要展示在最顶层（z-99999）
 * - 单一对话框实例共享于整个系统
 * - UI 层与 Store 分离，业务逻辑通过 useDialogStore 解耦
 * 
 * @author yume
 * @created 2026-02-11
 * @lastModified 2026-03-05
 * @module src/os/system/GlobalDialogs
 */

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

    // Action Sheet 渲染逻辑 (保持相对原生/轻量级的菜单体验)
    if (request.type === 'action-sheet') {
        return (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={cancel}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-[280px] bg-[var(--os-bg-panel)]/90 backdrop-blur-xl border border-[var(--os-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {(request.title || request.message) && (
                        <div className="px-4 py-3 border-b border-[var(--os-border)] text-center">
                            {request.title && (
                                <h3 className="text-sm font-semibold text-[var(--os-text-primary)]">
                                    {request.title}
                                </h3>
                            )}
                            {request.message && (
                                <p className="mt-1 text-xs text-[var(--os-text-secondary)]">
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
                                    className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors flex items-center gap-2 ${option.isDestructive
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

    // 常规 Alert/Confirm/Prompt 桌面对话框渲染逻辑
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-[360px] bg-[var(--os-bg-panel)]/90 backdrop-blur-xl border border-[var(--os-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                <div className="px-6 pt-5 pb-4 space-y-2">
                    <h3 className="font-semibold text-base text-[var(--os-text-primary)] text-left flex items-center gap-2">
                        {/* 此处可预留图标空间 */}
                        {request.title}
                    </h3>
                    {request.message && (
                        <p className="text-sm leading-relaxed text-[var(--os-text-secondary)] text-left whitespace-pre-wrap">
                            {request.message}
                        </p>
                    )}
                </div>

                {request.type === 'prompt' && (
                    <div className="px-6 pb-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={request.placeholder}
                            className="w-full px-3 py-2 bg-[var(--os-bg)] border border-[var(--os-border)] focus:border-[var(--os-accent)] rounded-md text-sm text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--os-accent)]/20 transition-all font-mono"
                        />
                    </div>
                )}

                <div className="px-6 py-4 bg-[var(--os-bg)]/30 border-t border-[var(--os-border)] flex justify-end gap-3 rounded-b-xl">
                    {request.type !== 'alert' && (
                        <button
                            onClick={cancel}
                            className="px-4 py-1.5 text-sm font-medium text-[var(--os-text-primary)] bg-[var(--os-hover-bg)] hover:bg-[var(--os-active-bg)] active:scale-95 border border-[var(--os-border)] rounded-md transition-all drop-shadow-sm"
                        >
                            {t('common.cancel') || '取消'}
                        </button>
                    )}
                    <button
                        onClick={() => request.type === 'prompt' ? submit(inputValue) : submit()}
                        className={`px-4 py-1.5 text-sm font-medium text-white bg-[var(--os-accent)] hover:bg-blue-600 active:scale-95 border border-transparent rounded-md transition-all shadow-sm flex items-center justify-center min-w-[72px] ${request.type === 'alert' ? 'ml-auto' : ''}`}
                    >
                        {t('common.ok') || '确定'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
