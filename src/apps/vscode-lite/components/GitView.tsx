import React, { useState } from 'react'
import { GitCommit, RefreshCw, Check, MoreHorizontal, Plus, Play } from 'lucide-react'
import { VSCODE_COLORS } from '../constants'
import { useDialog } from '../hooks/useDialog'

export const GitView: React.FC = () => {
    const { alert } = useDialog()
    const [message, setMessage] = useState('')
    const [isCommitting, setIsCommitting] = useState(false)

    // Placeholder changes for visual demo
    // In a real app, this would come from git status
    const changes: { file: string, status: string }[] = [
        // { file: 'src/App.tsx', status: 'M' },
        // { file: 'src/components/Button.tsx', status: 'A' },
    ]

    const handleCommit = async () => {
        if (!message.trim()) return
        setIsCommitting(true)
        await alert(
            `Simulated commit: "${message}"\n\n(No actual git operations performed in this demo)`,
            'Git Commit'
        )
        setIsCommitting(false)
        setMessage('')
    }

    return (
        <div className="h-full flex flex-col text-[#cccccc] bg-[#252526]">
            {/* Header */}
            <div className="h-9 px-4 flex items-center justify-between text-xs uppercase tracking-wider text-gray-400 font-medium shrink-0">
                <span>Source Control</span>
                <div className="flex gap-2">
                    <RefreshCw size={14} className="hover:text-white cursor-pointer" />
                    <MoreHorizontal size={14} className="hover:text-white cursor-pointer" />
                </div>
            </div>

            {/* Commit Input Area */}
            <div className="p-4 border-b border-[#2b2b2b]">
                <div className="flex flex-col gap-2">
                    <textarea
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 outline-none text-sm px-2 py-1 placeholder-gray-500 text-white resize-none h-20"
                        placeholder="Message (Ctrl+Enter to commit)"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    />
                    <button
                        className={`
                            flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white
                            ${message ? 'bg-[#007acc] hover:bg-[#0062a3]' : 'bg-[#4d4d4d] cursor-not-allowed opacity-50'}
                        `}
                        onClick={handleCommit}
                        disabled={!message || isCommitting}
                    >
                        <Check size={14} />
                        <span>Commit</span>
                    </button>
                </div>
            </div>

            {/* Changes List */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-bold uppercase flex items-center justify-between group cursor-pointer hover:bg-[#2a2d2e]">
                    <span>Changes</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <Plus size={14} className="hover:text-white" />
                    </div>
                </div>

                {changes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs italic">
                        No changes detected.
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {changes.map((change, idx) => (
                            <div key={idx} className="px-4 py-1 flex items-center gap-2 hover:bg-[#2a2d2e] cursor-pointer text-sm">
                                <span className="text-yellow-400 font-bold w-3 text-center text-xs">{change.status}</span>
                                <span className="truncate text-gray-300">{change.file}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
