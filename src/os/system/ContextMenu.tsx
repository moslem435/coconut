'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useContextMenuItems } from '@/os/system/context-menu/useContextMenuItems'

export default function SystemContextMenu() {
  const { visible, position, type, data, hideMenu } = useContextMenuStore(useShallow(state => ({
    visible: state.visible,
    position: state.position,
    type: state.type,
    data: state.data,
    hideMenu: state.hideMenu
  })))

  const { useAnimations } = useSystemSettings()
  const menuRef = useRef<HTMLDivElement>(null)

  // Get items using the aggregated hook
  const menuItems = useContextMenuItems(visible, type, data, position, hideMenu)

  // Handle outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu()
      }
    }
    const handleScroll = () => hideMenu()

    if (visible) {
      document.addEventListener('click', handleClick)
      document.addEventListener('scroll', handleScroll)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [visible, hideMenu])

  // Calculate menu position to avoid overflow
  const getMenuStyle = () => {
    const menuWidth = 200
    // Estimate height based on items (approx 36px per item + separators)
    const menuHeight = menuItems.length * 36 + 20
    let x = position.x
    let y = position.y

    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10
      }
    }

    return { top: y, left: x }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: useAnimations ? 0.1 : 0 }}
          className="fixed z-[20000] min-w-[220px] bg-[#1e1e1e]/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl py-1.5 overflow-hidden select-none font-sans"
          style={getMenuStyle()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={index} className="h-px bg-white/10 my-1 mx-3" />
            }

            const Icon = item.icon

            return (
              <div className="px-1" key={index}>
                <button
                  onClick={() => {
                    if (item.action) item.action()
                    // Actions usually call hideMenu, but just in case
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] font-medium transition-all rounded-lg group
                    ${item.danger
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon size={15} className={item.danger ? 'opacity-90' : "opacity-70 group-hover:opacity-100 transition-opacity"} />}
                    <span>{item.label}</span>
                  </div>
                  {(item as any).checked && <Check size={14} className="opacity-80" />}
                </button>
              </div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
