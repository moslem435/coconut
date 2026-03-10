import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface RenameInputProps {
  initialValue: string
  className?: string
  onComplete: (newValue: string) => void
  onCancel: () => void
}

export function RenameInput({ initialValue, className, onComplete, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-resize logic using a hidden span
  const [width, setWidth] = useState<number>(0)
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (spanRef.current) {
      // Add some padding/buffer to the width
      setWidth(spanRef.current.offsetWidth + 20)
    }
  }, [value])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      // Select filename without extension
      const lastDotIndex = initialValue.lastIndexOf('.')
      if (lastDotIndex > 0) {
        inputRef.current.setSelectionRange(0, lastDotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation() // Prevent triggering other shortcuts
    if (e.key === 'Enter') {
      e.preventDefault()
      onComplete(value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    onComplete(value)
  }

  return (
    <>
      <span ref={spanRef} className="absolute opacity-0 pointer-events-none text-xs whitespace-pre px-1 font-sans">
        {value || ' '}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        style={{ width: width ? `${width}px` : '100%' }}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-[var(--os-bg-input)] border border-[var(--os-accent)] text-[var(--os-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--os-accent)]/20",
          className
        )}
      />
    </>
  )
}
