import { useState, useCallback } from 'react'

export function useFileSelection(items: { id: string }[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback((id: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (!id) {
      setSelectedIds([])
      setLastSelectedId(null)
      return
    }

    // If no event provided, treat as single select
    if (!e) {
      setSelectedIds([id])
      setLastSelectedId(id)
      return
    }

    const isMulti = (e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey || (e as React.KeyboardEvent).ctrlKey || (e as React.KeyboardEvent).metaKey
    const isRange = (e as React.MouseEvent).shiftKey || (e as React.KeyboardEvent).shiftKey

    if (isRange && lastSelectedId) {
      // Range selection logic
      const lastIndex = items.findIndex(item => item.id === lastSelectedId)
      const currentIndex = items.findIndex(item => item.id === id)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = items.slice(start, end + 1).map(item => item.id)
        
        // If ctrl is held, add to existing. If not, replace.
        if (isMulti) {
           setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])))
        } else {
           setSelectedIds(rangeIds)
        }
      } else {
          // Fallback if index not found
          setSelectedIds([id])
          setLastSelectedId(id)
      }
    } else if (isMulti) {
      // Toggle selection
      setSelectedIds(prev => {
        if (prev.includes(id)) {
           return prev.filter(i => i !== id)
        } else {
           return [...prev, id]
        }
      })
      setLastSelectedId(id)
    } else {
      // Single select
      setSelectedIds([id])
      setLastSelectedId(id)
    }
  }, [items, lastSelectedId])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setLastSelectedId(null)
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    handleSelect,
    clearSelection
  }
}
