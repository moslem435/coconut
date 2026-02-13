import React, { useState, useRef, useEffect } from 'react'
import { VSCODE_COLORS } from '../constants'

interface MenuItem {
    label: string
    action?: () => void
    checked?: boolean
    disabled?: boolean
    separator?: boolean
    shortcut?: string
}

interface MenuProps {
    label: string
    items: MenuItem[]
}

export const Menubar: React.FC<{ menus: MenuProps[] }> = ({ menus }) => {
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setActiveMenuIndex(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="flex items-center h-full" ref={containerRef}>
            {menus.map((menu, index) => {
                const isActive = activeMenuIndex === index

                return (
                    <div key={index} className="relative h-full flex items-center">
                        <div
                            className={`
                px-2 h-[22px] flex items-center cursor-pointer rounded-sm select-none text-[13px]
                ${isActive ? 'bg-[#3c3c3c] text-white' : 'text-[#cccccc] hover:text-white'}
              `}
                            onClick={() => setActiveMenuIndex(isActive ? null : index)}
                            onMouseEnter={() => {
                                if (activeMenuIndex !== null) {
                                    setActiveMenuIndex(index)
                                }
                            }}
                        >
                            {menu.label}
                        </div>

                        {isActive && (
                            <div
                                className="absolute top-full left-0 min-w-[220px] bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 flex flex-col rounded-sm"
                                style={{ marginTop: '4px' }}
                            >
                                {menu.items.map((item, i) => {
                                    if (item.separator) {
                                        return <div key={i} className="h-[1px] bg-[#454545] my-1 mx-2" />
                                    }

                                    return (
                                        <div
                                            key={i}
                                            className={`
                        px-3 py-1.5 flex items-center justify-between cursor-pointer text-[13px]
                        hover:bg-[#094771] hover:text-white group
                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-[#cccccc]'}
                      `}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (!item.disabled && item.action) {
                                                    item.action()
                                                    setActiveMenuIndex(null)
                                                }
                                            }}
                                        >
                                            <span>{item.label}</span>
                                            {item.shortcut && <span className="text-xs ml-4 text-[#8b949e] group-hover:text-white">{item.shortcut}</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
