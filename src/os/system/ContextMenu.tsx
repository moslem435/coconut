/**
 * @fileoverview 右键菜单组件 - 渲染动态右键菜单
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-03-09
 * @module src/os/system/ContextMenu
 */

'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useContextMenuItems } from '@/os/system/context-menu/useContextMenuItems'
import { MenuItem } from '@/os/system/context-menu/types'

// SubMenu Component
const SubMenu = ({ items, parentRef, onClose }: { items: MenuItem[], parentRef: React.RefObject<HTMLButtonElement | null>, onClose: () => void }) => {
  const { useAnimations } = useSystemSettings()
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (parentRef.current && menuRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()

      let left = parentRect.right
      let top = parentRect.top

      // Check if submenu fits on the right
      if (left + menuRect.width > window.innerWidth) {
        left = parentRect.left - menuRect.width
      }

      // Check if submenu fits at the bottom
      if (top + menuRect.height > window.innerHeight) {
        top = parentRect.bottom - menuRect.height
      }

      setPosition({ top, left })
    }
  }, [])

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: useAnimations ? 0.1 : 0 }}
      className="fixed z-[20001] min-w-[200px] bg-[var(--os-bg-panel)]/95 backdrop-blur-xl border border-[var(--os-border)] shadow-xl rounded-xl py-1.5 overflow-hidden select-none font-sans"
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, index) => (
        <MenuItemComponent key={index} item={item} onClose={onClose} />
      ))}
    </motion.div>
  )
}

// MenuItem Component
const MenuItemComponent = ({ item, onClose }: { item: MenuItem, onClose: () => void }) => {
  const [showSubMenu, setShowSubMenu] = useState(false)
  const itemRef = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (item.submenu) {
      timeoutRef.current = setTimeout(() => setShowSubMenu(true), 200)
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (item.submenu) {
      // Delay hiding to allow moving to submenu
      timeoutRef.current = setTimeout(() => setShowSubMenu(false), 300)
    }
  }

  if (item.type === 'separator') {
    return <div className="h-px bg-[var(--os-border)] my-1 mx-3" />
  }

  const Icon = item.icon

  return (
    <div
      className="px-1 relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={itemRef}
        disabled={item.disabled}
        onClick={() => {
          if (!item.disabled && item.action) {
            item.action()
            // Actions usually call hideMenu, but just in case
          }
        }}
        className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] font-medium transition-all rounded-lg group
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${item.danger
            ? 'text-[var(--os-danger)] hover:bg-[var(--os-danger)]/10 hover:text-[var(--os-danger)]'
            : 'text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]'
          }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={15} className={item.danger ? 'opacity-90' : "opacity-70 group-hover:opacity-100 transition-opacity"} />}
          <span>{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.shortcut && <span className="text-[10px] opacity-50">{item.shortcut}</span>}
          {item.checked && <Check size={14} className="opacity-80" />}
          {item.submenu && <ChevronRight size={14} className="opacity-50" />}
        </div>
      </button>

      <AnimatePresence>
        {showSubMenu && item.submenu && (
          <SubMenu items={item.submenu} parentRef={itemRef} onClose={onClose} />
        )}
      </AnimatePresence>
    </div>
  )
}

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
      // Check if click is inside menu or any submenu
      // Since submenus are portals/fixed, we need to be careful
      // But here we rely on React event propagation or checking composedPath
      // Actually, for simplicity, if we click outside the main menu ref, we hide.
      // But submenus are outside main menu DOM.
      // So we need to check if target is inside any context menu container.
      const target = e.target as HTMLElement
      if (!target.closest('[class*="bg-[var(--os-bg-panel)]"]')) {
        hideMenu()
      }
    }
    const handleScroll = () => hideMenu()

    if (visible) {
      document.addEventListener('mousedown', handleClick) // mousedown is better for outside click
      document.addEventListener('scroll', handleScroll)
    }

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [visible, hideMenu])

  // Calculate menu position to avoid overflow
  const getMenuStyle = () => {
    const menuWidth = 220
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
          className="fixed z-[20000] min-w-[220px] bg-[var(--os-bg-panel)]/85 backdrop-blur-xl border border-[var(--os-border)] shadow-2xl rounded-xl py-1.5 overflow-hidden select-none font-sans"
          style={getMenuStyle()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map((item, index) => (
            <MenuItemComponent key={index} item={item} onClose={hideMenu} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
