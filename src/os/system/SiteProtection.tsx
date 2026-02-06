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
