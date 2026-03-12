/**
 * @fileoverview 站点保护组件 - 防止内嵌和右键菜单
 * 
 * 为什么需要防议预联部试验：
 * - 防止内嵌到 iframe 导致点击劫持攻击
 * - 禁用右键菜单防止资源泄露
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-02-06
 * @module src/os/system/SiteProtection
 */

"use client"

import { useEffect } from "react"

export function SiteProtection() {
  useEffect(() => {
    // Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // Disable Copy Shortcuts (Ctrl+C, Cmd+C)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
      }
    }
    
    // Disable Copy Event (Selection copy)
    const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault()
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("copy", handleCopy)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("copy", handleCopy)
    }
  }, [])

  return null
}
