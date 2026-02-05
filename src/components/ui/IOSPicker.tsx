'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, animate, PanInfo, useMotionValueEvent } from 'framer-motion'
import { cn } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

export interface IOSPickerHandle {
  handleWheel: (e: React.WheelEvent) => void
  handlePointerDown: (e: React.PointerEvent) => void
  handlePointerMove: (e: React.PointerEvent) => void
  handlePointerUp: (e: React.PointerEvent) => void
}

interface IOSPickerProps {
  items: { id: string; title: string }[]
  value: number
  onChange: (index: number) => void
  onItemClick?: (index: number) => void
  itemHeight?: number
  height?: number
  perspective?: number
  parentRotation?: number
}

const IOSPicker = forwardRef<IOSPickerHandle, IOSPickerProps>(({
  items,
  value,
  onChange,
  onItemClick,
  itemHeight = 80,
  height = 400,
  perspective = 600,
  parentRotation = 0
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // The scroll position in pixels (0 to items.length * itemHeight)
  const VIRTUAL_MULTIPLIER = 100
  const INITIAL_SCROLL = (items.length * VIRTUAL_MULTIPLIER / 2) * itemHeight
  
  const scrollY = useMotionValue(INITIAL_SCROLL)
  
  // Track the last index to trigger sound
  const lastIndex = useRef(Math.floor(INITIAL_SCROLL / itemHeight))

  // Refs for stable access in motion callbacks
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  
  useEffect(() => {
    onChangeRef.current = onChange
    valueRef.current = value
  }, [onChange, value])

  useMotionValueEvent(scrollY, "change", (latest) => {
    const currentIndex = Math.round(latest / itemHeight)
    
    if (currentIndex !== lastIndex.current) {
      // Resume context on scroll interaction if needed
      soundManager.resume()
      
      soundManager.playHover()
      lastIndex.current = currentIndex
      
      const normalizedIndex = ((currentIndex % items.length) + items.length) % items.length
      
      // Safety check for NaN
      if (Number.isNaN(normalizedIndex)) return

      if (valueRef.current !== normalizedIndex) {
         onChangeRef.current(normalizedIndex)
      }
    }
  })

  const snapToNearest = (targetY?: number) => {
    const current = targetY ?? scrollY.get()
    const index = Math.round(current / itemHeight)
    const target = index * itemHeight
    
    animate(scrollY, target, {
      type: "spring",
      stiffness: 200,
      damping: 30,
      onComplete: () => {
         const normalizedIndex = ((index % items.length) + items.length) % items.length
         onChange(normalizedIndex)
      }
    })
  }

  // Handle Wheel
  const handleWheel = (e: React.WheelEvent) => {
    soundManager.resume()
    const current = scrollY.get()
    const delta = e.deltaY * 0.5 
    scrollY.set(current + delta)
    
    clearTimeout((window as any).snapTimeout)
    ;(window as any).snapTimeout = setTimeout(() => {
      snapToNearest()
    }, 60)
  }

  // Manual Drag Handling
  const dragStartY = useRef(0)
  const dragStartScroll = useRef(0)
  const lastDragTime = useRef(0)
  const lastDragY = useRef(0)
  const velocityRef = useRef(0) // Track smoothed velocity

  const handlePointerDown = (e: React.PointerEvent) => {
    soundManager.resume() 
    
    // Safety Reset: Keep scrollY within reasonable bounds to prevent precision issues
    const currentScroll = scrollY.get()
    const cycleHeight = items.length * itemHeight
    // If we are more than 10 cycles away from initial, reset closer
    if (Math.abs(currentScroll - INITIAL_SCROLL) > cycleHeight * 10) {
        const cycles = Math.round((currentScroll - INITIAL_SCROLL) / cycleHeight)
        const resetScroll = currentScroll - (cycles * cycleHeight)
        scrollY.set(resetScroll)
        // We must also update lastIndex to prevent a jump in logic
        lastIndex.current = Math.round(resetScroll / itemHeight)
    }

    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartScroll.current = scrollY.get()
    lastDragTime.current = performance.now()
    lastDragY.current = e.clientY
    velocityRef.current = 0
    
    scrollY.stop()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    
    const now = performance.now()
    const deltaY = e.clientY - dragStartY.current
    const sensitivity = 1.5 
    
    scrollY.set(dragStartScroll.current - deltaY * sensitivity)
    
    // Calculate instantaneous velocity
    const timeDelta = Math.max(now - lastDragTime.current, 1)
    const moveDelta = e.clientY - lastDragY.current
    
    // Smooth velocity: 80% new, 20% old (simple low-pass filter)
    const instantVelocity = -moveDelta / timeDelta
    velocityRef.current = velocityRef.current * 0.2 + instantVelocity * 0.8
    
    lastDragTime.current = now
    lastDragY.current = e.clientY
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    
    // Use the tracked smoothed velocity
    let velocity = velocityRef.current
    
    // Cap velocity significantly to prevent flying off
    const MAX_VELOCITY = 3 // Reduced from 8 to 3 px/ms
    velocity = Math.max(Math.min(velocity, MAX_VELOCITY), -MAX_VELOCITY)
    
    const totalMove = Math.abs(e.clientY - dragStartY.current)
    const timeSinceLastMove = performance.now() - lastDragTime.current

    // If user stopped dragging for a moment before releasing, kill velocity
    if (timeSinceLastMove > 100) {
        velocity = 0
    }

    if (totalMove < 5 && timeSinceLastMove < 200) {
      const current = scrollY.get()
      const rawIndex = Math.round(current / itemHeight)
      const normalizedIndex = ((rawIndex % items.length) + items.length) % items.length
      onItemClick?.(normalizedIndex)
    } else {
      // Calculate target manually to avoid "object as target" error with animate()
      // and to ensure strictly controlled landing point
      const current = scrollY.get()
      
      // Calculate inertial slide distance
      // velocity is px/ms. We estimate slide duration and drag.
      // A simple multiplier of 600-800ms gives a natural feel.
      const slideDistance = velocity * 600 
      
      let target = current + slideDistance
      
      // Apply Safety Limits
      const maxScrollDistance = itemHeight * 15
      
      // Clamp target within a safe range relative to start
      if (target > current + maxScrollDistance) {
        target = current + maxScrollDistance
      } else if (target < current - maxScrollDistance) {
        target = current - maxScrollDistance
      }
      
      // Snap to nearest item
      const snappedTarget = Math.round(target / itemHeight) * itemHeight
      
      // Animate to the calculated safe target
      animate(scrollY, snappedTarget, {
        type: "spring",
        stiffness: 200, // Higher stiffness for snappier stop
        damping: 30,    // Critical damping to avoid oscillation
        restDelta: 1
      })
    }
  }

  useImperativeHandle(ref, () => ({
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  }))

  return (
    <div 
      ref={containerRef}
      className="relative w-full select-none"
      style={{ 
        height, 
        perspective,
        transform: 'translateZ(100px)', 
        transformStyle: 'preserve-3d',
        // Removed maskImage to prevent 3D context flattening issues which can cause elements to disappear
        // maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        // WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
      }}
      // Internal wheel listener as fallback
      onWheel={handleWheel}
    >
      {/* Items */}
      <div 
        className="absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {Array.from({ length: Math.ceil(height / itemHeight) + 4 }).map((_, i) => {
          return (
             <WheelItem 
                key={i} 
                indexOffset={i - Math.ceil((height / itemHeight + 4) / 2)} 
                scrollY={scrollY} 
                itemHeight={itemHeight} 
                items={items}
                totalItems={items.length}
             />
          )
        })}
      </div>
    </div>
  )
})

IOSPicker.displayName = "IOSPicker"

function WheelItem({ 
  indexOffset, 
  scrollY, 
  itemHeight, 
  items, 
  totalItems 
}: { 
  indexOffset: number
  scrollY: any 
  itemHeight: number
  items: any[]
  totalItems: number
}) {
  const y = useTransform(scrollY, (v: number) => {
    const currentIndex = Math.round(v / itemHeight)
    const targetIndex = currentIndex + indexOffset
    return (targetIndex * itemHeight) - v
  })

  const index = useTransform(scrollY, (v: number) => {
    const currentIndex = Math.round(v / itemHeight)
    return currentIndex + indexOffset
  })

  const title = useTransform(index, (i: number) => {
    const normalized = ((Math.round(i) % totalItems) + totalItems) % totalItems
    return items[normalized]?.title || ""
  })
  
  // 3D Transforms
  const rotateX = useTransform(y, (currentY) => {
    const angle = (currentY / itemHeight) * -25 
    return Math.max(Math.min(angle, 90), -90)
  })

  const opacity = useTransform(y, (currentY) => {
    const dist = Math.abs(currentY)
    const normalizedDist = dist / (itemHeight * 3.5)
    return Math.max(0, 1 - Math.pow(normalizedDist, 1.5)) 
  })

  const scale = useTransform(y, (currentY) => {
    const dist = Math.abs(currentY)
    return 1.1 - (dist / (itemHeight * 6))
  })

  const z = useTransform(y, (currentY) => {
    const dist = Math.abs(currentY)
    return -dist * 0.8 
  })
  
  const blur = useTransform(y, (currentY) => {
      const dist = Math.abs(currentY)
      return `blur(${Math.min(dist / 40, 8)}px)`
  })
  
  const color = useTransform(y, (currentY) => {
      const dist = Math.abs(currentY)
      return dist < itemHeight * 0.5 ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.4)"
  })

  return (
    <motion.div
      className="absolute left-0 right-0 flex items-center justify-end pr-12 h-[80px] origin-center"
      style={{
        y,
        rotateX,
        opacity,
        scale,
        z,
        filter: blur,
        height: itemHeight,
        backfaceVisibility: 'hidden', 
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      <motion.span 
        className="font-mono text-2xl md:text-4xl font-bold tracking-tighter whitespace-nowrap transition-colors duration-200"
        style={{ color }}
      >
        {title}
      </motion.span>
    </motion.div>
  )
}

export default IOSPicker
