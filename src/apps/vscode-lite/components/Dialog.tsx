import React, { useState, useEffect, useRef } from 'react'
import { useDialog } from '../hooks/useDialog'
import { VSCODE_COLORS } from '../constants'

export const DialogContainer: React.FC = () => {
    const { isOpen, config, close } = useDialog()
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && config?.type === 'prompt') {
            setInputValue(config.defaultValue || '')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen, config])

    if (!isOpen || !config) return null

    const handleConfirm = () => {
        if (config.type === 'prompt') {
            close(inputValue)
        } else if (config.type === 'confirm') {
            close(true)
        } else {
            close(undefined)
        }
    }

    const handleCancel = () => {
        if (config.type === 'prompt') {
            close(null)
        } else {
            close(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm()
        if (e.key === 'Escape') handleCancel()
    }

    return (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-8 bg-black/20" onKeyDown={handleKeyDown}>
            <div
                className="w-96 shadow-xl border border-[#454545] text-white flex flex-col"
                style={{ backgroundColor: '#252526', boxShadow: '0 0 8px 2px rgba(0,0,0,0.4)' }}
            >
                {/* Header (Optional, VS Code inputs are usually bare, but let's add a title bar for clarity) */}
                {config.title && (
                    <div className="bg-[#333333] px-3 py-1 text-xs font-bold uppercase tracking-wider border-b border-[#333333] select-none text-gray-300">
                        {config.title}
                    </div>
                )}

                {/* Body */}
                <div className="p-4 flex flex-col gap-3">
                    <div className="text-sm text-gray-200">{config.message}</div>

                    {config.type === 'prompt' && (
                        <input
                            ref={inputRef}
                            className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] text-white text-sm px-2 py-1 outline-none"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={(e) => e.target.select()}
                        />
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                        {config.type !== 'alert' && (
                            <button
                                className="px-3 py-1 text-sm hover:bg-[#3e3e42] text-white transition-colors"
                                onClick={handleCancel}
                            >
                                {config.cancelText || 'Cancel'}
                            </button>
                        )}
                        <button
                            className="px-3 py-1 text-sm bg-[#0e639c] hover:bg-[#1177bb] text-white transition-colors"
                            onClick={handleConfirm}
                        >
                            {config.confirmText || 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
