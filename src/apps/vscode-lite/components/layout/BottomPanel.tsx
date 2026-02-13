'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Terminal, Maximize2, X } from 'lucide-react'
import { VSCODE_COLORS } from '../../constants'

// Dynamically import XTerm to avoid SSR issues
const XTerm = dynamic(() => import('@/os/components/XTerm'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-[#cccccc] opacity-50">Loading Terminal...</div>
})

interface BottomPanelProps {
    onClose: () => void
    height?: number | string
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ onClose }) => {
    // TODO: Add support for multiple tabs (Output, Debug Console, Problems)
    const [activeTab, setActiveTab] = React.useState<'terminal' | 'output' | 'problems'>('terminal')

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e] border-t border-[#2b2b2b]">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-4 h-9 bg-[#1e1e1e] select-none shrink-0">
                <div className="flex items-center gap-6 h-full">
                    <button
                        className={`h-full text-xs uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'terminal' ? 'text-white border-[#e7e7e7]' : 'text-[#969696] border-transparent hover:text-[#cccccc]'}`}
                        onClick={() => setActiveTab('terminal')}
                    >
                        Terminal
                    </button>
                    <button
                        className={`h-full text-xs uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'output' ? 'text-white border-[#e7e7e7]' : 'text-[#969696] border-transparent hover:text-[#cccccc]'}`}
                        onClick={() => setActiveTab('output')}
                    >
                        Output
                    </button>
                    <button
                        className={`h-full text-xs uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'problems' ? 'text-white border-[#e7e7e7]' : 'text-[#969696] border-transparent hover:text-[#cccccc]'}`}
                        onClick={() => setActiveTab('problems')}
                    >
                        Problems
                    </button>
                </div>

                <div className="flex items-center gap-2 text-[#969696]">
                    <button className="hover:text-white" title="Maximize Panel">
                        <Maximize2 size={14} />
                    </button>
                    <button className="hover:text-white" onClick={onClose} title="Close Panel">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative p-2 pl-4">
                {activeTab === 'terminal' && (
                    <div className="h-full w-full">
                        <XTerm className="h-full w-full" style={{ backgroundColor: '#1e1e1e' }} />
                    </div>
                )}
                {activeTab === 'output' && (
                    <div className="h-full w-full text-sm text-[#cccccc] p-2 font-mono">
                        [Info] VS Code Lite Output Channel
                    </div>
                )}
                {activeTab === 'problems' && (
                    <div className="h-full w-full text-sm text-[#cccccc] p-2">
                        No problems detected.
                    </div>
                )}
            </div>
        </div>
    )
}
