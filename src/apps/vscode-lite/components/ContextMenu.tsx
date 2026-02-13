'use client'

import React, { useEffect, useRef } from 'react'

interface ContextMenuItem {
    label: string
    action: () => void
    separator?: boolean
    danger?: boolean
}

interface ContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    // Prevent menu from going off-screen (simple check)
    const style: React.CSSProperties = {
        top: y,
        left: x,
        position: 'fixed',
        zIndex: 9999,
    }

    return (
        <div
            ref={menuRef}
            style={style}
            className="bg-[#252526] border border-[#454545] shadow-xl py-1 w-48 rounded-sm animate-in fade-in duration-100 flex flex-col"
        >
            {items.map((item, index) => {
                if (item.separator) {
                    return <div key={index} className="h-[1px] bg-[#454545] my-1" />
                }
                return (
                    <div
                        key={index}
                        className={`
                    px-3 py-1.5 text-xs cursor-pointer flex items-center
                    ${item.danger ? 'text-red-400 hover:bg-[#3d1f1f]' : 'text-gray-200 hover:bg-[#094771] hover:text-white'}
                `}
                        onClick={() => {
                            item.action()
                            onClose()
                        }}
                    >
                        {item.label}
                    </div>
                )
            })}
        </div>
    )
}
