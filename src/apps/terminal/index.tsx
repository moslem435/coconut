import React from 'react'
import dynamic from 'next/dynamic'

// Dynamically import XTerm to avoid SSR issues with xterm.js
const XTerm = dynamic(() => import('@/os/components/XTerm'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Node.js Environment...</div>
})

const Terminal: React.FC = () => {
  return (
    // pt-10 to account for window title bar (App Window Padding Convention)
    <div className="h-full w-full pt-10 bg-[var(--os-bg-window)]">
      <XTerm className="h-full w-full" />
    </div>
  )
}

export default Terminal
