import React, { useState, useEffect, useRef } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import { VSCODE_COLORS } from '../constants'

interface Command {
    id: string
    title: string
    shortcut?: string
    action: () => void
}

interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
    commands: Command[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const filteredCommands = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query.toLowerCase())
    )

    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const cmd = filteredCommands[selectedIndex]
            if (cmd) {
                cmd.action()
                onClose()
            }
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="absolute inset-0 z-[9999] flex justify-center pt-2" onClick={onClose} onMouseDown={(e) => e.stopPropagation()}>
            <div
                className="w-[600px] bg-[#252526] shadow-2xl rounded-md flex flex-col border border-[#454545]"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '400px', boxShadow: '0 0 10px 4px rgba(0,0,0,0.3)' }}
            >
                <div className="p-2 border-b border-[#454545] flex items-center gap-2">
                    <span className="text-gray-400 opacity-50"><ChevronRight size={16} /></span>
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none text-white outline-none placeholder-gray-500 text-sm"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setSelectedIndex(0)
                        }}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                    {filteredCommands.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500 text-sm">No matching commands</div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className={`
                                    px-3 py-1.5 flex items-center justify-between cursor-pointer text-sm gap-4
                                    ${index === selectedIndex ? 'bg-[#04395e] text-white' : 'text-gray-300 hover:bg-[#2a2d2e]'}
                                `}
                                onClick={() => {
                                    cmd.action()
                                    onClose()
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span>{cmd.title}</span>
                                {cmd.shortcut && (
                                    <span className="text-xs text-gray-400">{cmd.shortcut}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
