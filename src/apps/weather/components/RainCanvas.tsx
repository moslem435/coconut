import React, { useEffect, useRef } from 'react'

interface RainCanvasProps {
  intensity: 'light' | 'heavy'
  layer?: 'front' | 'back'
  windSpeed?: number // km/h
  windDirection?: number // degrees (0=N, 90=E, 180=S, 270=W)
}

interface Drop {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
}

interface Splash {
  x: number
  y: number
  age: number
  maxAge: number
  size: number
  normal: { x: number, y: number } // Direction of splash
}

export function RainCanvas({ intensity, layer = 'front', windSpeed = 0, windDirection = 0 }: RainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropsRef = useRef<Drop[]>([])
  const splashesRef = useRef<Splash[]>([])
  const rectsRef = useRef<DOMRect[]>([])
  const requestRef = useRef<number>(0)
  
  // Calculate horizontal velocity based on wind
  // windDirection: 0=N (from North, blows South), 90=E (from East, blows West)
  // We need to convert meteorological wind direction to vector
  // Wind from North (0) -> pushes drops South (+y) - this adds to gravity, but usually wind is horizontal effect
  // Wind from East (90) -> pushes drops West (-x)
  // Wind from West (270) -> pushes drops East (+x)
  
  // Simple approximation: 
  // Map wind speed km/h to pixel shift per frame
  // e.g. 10km/h -> 1px/frame
  
  // Calculate wind vector components
  // Note: Meteorological wind direction is "coming from"
  // So wind 90 (East) means coming from East, blowing towards West (-x)
  // angle in rads for math: (windDirection - 90) * (PI/180) to rotate to standard unit circle?
  // Let's use simpler logic:
  // West (270) -> blows to East (+x)
  // East (90) -> blows to West (-x)
  const windRad = (windDirection - 180) * (Math.PI / 180) 
  // If wind is 270 (West), windRad = 90 deg = points up? No.
  // Let's just use:
  // U component (East-West): -sin(direction)
  // If dir=0 (N), sin(0)=0. No horizontal push.
  // If dir=90 (E), sin(90)=1. -1 means push Left (-x). Correct.
  // If dir=270 (W), sin(270)=-1. -(-1)=1 means push Right (+x). Correct.
  
  const windRef = useRef({ speed: windSpeed, direction: windDirection })

  // Update wind ref when props change
  useEffect(() => {
    windRef.current = { speed: windSpeed, direction: windDirection }
  }, [windSpeed, windDirection])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateDimensions = () => {
      if (!canvas) return
      const canvasRect = canvas.getBoundingClientRect()
      
      // Use canvas's own dimensions for drawing buffer
      canvas.width = canvasRect.width
      canvas.height = canvasRect.height
      updateRects()
      initDrops()
    }

    const updateRects = () => {
      // Only update rects if this is the front layer
      if (layer !== 'front' || !canvas) return

      const canvasRect = canvas.getBoundingClientRect()

      // Get all card elements
      const elements = document.querySelectorAll('.weather-card-collision')
      
      rectsRef.current = Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect()
        // Convert to canvas-relative coordinates
        return {
            ...rect.toJSON(), // Need to copy rect properties
            left: rect.left - canvasRect.left,
            right: rect.right - canvasRect.left,
            top: rect.top - canvasRect.top,
            bottom: rect.bottom - canvasRect.top,
            width: rect.width,
            height: rect.height
        }
      })
    }

    // Initialize drops
    const initDrops = () => {
      if (!canvas) return
      
      // Calculate count based on area to maintain consistent density
      // Base density: approx 1 drop per X pixels
      // 100 drops for say 400x600 (240,000 px) -> 1 drop per 2400 px
      const area = canvas.width * canvas.height
      const densityFactor = intensity === 'light' ? 3500 : 1500
      let baseCount = Math.floor(area / densityFactor)
      
      // Clamp count to reasonable limits to prevent performance issues on huge screens
      // or too few drops on tiny screens
      baseCount = Math.max(20, Math.min(baseCount, 1500))

      const count = layer === 'back' ? baseCount * 0.6 : baseCount * 0.4
      
      // If we already have drops, try to reuse/adjust array to avoid full reset flicker
      if (dropsRef.current.length !== Math.floor(count)) {
         dropsRef.current = Array.from({ length: count }).map(() => {
          // Adjust speed based on intensity
          const baseSpeed = intensity === 'light' ? 12 : 25
          const speedVar = intensity === 'light' ? 5 : 10
          
          return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 20 + 10,
            // Back layer drops are slower to simulate distance
            speed: (Math.random() * speedVar + baseSpeed) * (layer === 'back' ? 0.7 : 1),
            // Back layer drops are less opaque
            opacity: (Math.random() * 0.3 + 0.1) * (layer === 'back' ? 0.5 : 1)
          }
        })
      }
    }

    const animate = () => {
      if (!canvas || !ctx) return

      // Calculate wind effect inside the loop from ref
      const { speed, direction } = windRef.current
      // Calculate wind tangent (ratio of horizontal to vertical speed)
      // Cap wind speed effect at 100km/h
      // At 100km/h, we want a significant angle, say 45-50 degrees (tangent ~1.0-1.2)
      const windTangentMagnitude = Math.max(0, Math.min(speed, 100)) / 80
      const windTangent = -Math.sin(direction * Math.PI / 180) * windTangentMagnitude

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and Draw Drops
      ctx.strokeStyle = `rgba(255, 255, 255, ${layer === 'back' ? 0.3 : 0.5})`
      ctx.lineWidth = layer === 'back' ? 0.5 : 1
      ctx.beginPath()

      for (let i = 0; i < dropsRef.current.length; i++) {
        const drop = dropsRef.current[i]
        
        // Move drop
        // Horizontal speed is proportional to vertical speed to maintain constant angle
        const horizontalSpeed = drop.speed * windTangent
        drop.y += drop.speed
        drop.x += horizontalSpeed

        // Wrap around horizontally
        if (drop.x > canvas.width) drop.x = 0
        if (drop.x < 0) drop.x = canvas.width

        // Collision Check (only for front layer)
        let collisionX = drop.x
        let collisionY = canvas.height
        let hit = false
        let normal = { x: 0, y: -1 } // Default normal (pointing up)

        if (layer === 'front') {
            // Check against cards
            for (const rect of rectsRef.current) {
                // Expanded collision check for sides
                const radius = 24 // rounded-3xl

                // 1. Check Top Surface Collision
                // Determine if we are within the horizontal bounds of the card (including corners approx)
                if (drop.x >= rect.left && drop.x <= rect.right) {
                    let surfaceY = rect.top

                    // Check left corner arc
                    if (drop.x < rect.left + radius) {
                        const dx = drop.x - (rect.left + radius)
                        const distSq = radius*radius - dx*dx
                        if (distSq >= 0) {
                            surfaceY = (rect.top + radius) - Math.sqrt(distSq)
                            // Calculate normal for left corner
                            // Circle center is (rect.left + radius, rect.top + radius)
                            // Impact point is (drop.x, surfaceY)
                            // Vector from center to impact: (drop.x - center.x, surfaceY - center.y)
                            // Normal is normalized vector
                            const cx = rect.left + radius
                            const cy = rect.top + radius
                            const vx = drop.x - cx
                            const vy = surfaceY - cy
                            const mag = Math.sqrt(vx*vx + vy*vy)
                            if (mag > 0) normal = { x: vx/mag, y: vy/mag }
                        }
                    }
                    // Check right corner arc
                    else if (drop.x > rect.right - radius) {
                        const dx = drop.x - (rect.right - radius)
                        const distSq = radius*radius - dx*dx
                        if (distSq >= 0) {
                            surfaceY = (rect.top + radius) - Math.sqrt(distSq)
                            // Calculate normal for right corner
                            const cx = rect.right - radius
                            const cy = rect.top + radius
                            const vx = drop.x - cx
                            const vy = surfaceY - cy
                            const mag = Math.sqrt(vx*vx + vy*vy)
                            if (mag > 0) normal = { x: vx/mag, y: vy/mag }
                        }
                    }

                    // If we crossed the top surface
                    if (drop.y >= surfaceY && drop.y <= surfaceY + drop.speed) {
                        collisionY = surfaceY
                        collisionX = drop.x
                        hit = true
                        // normal is already set correctly (either default up, or calculated corner normal)
                        break
                    }
                }

                // 2. Check Side Collision (Left or Right based on wind)
                // Only if wind is strong enough to hit sides
                if (!hit && Math.abs(horizontalSpeed) > 0.1) {
                    // Wind from left (moving right) -> Hit Left Side
                    if (horizontalSpeed > 0) {
                        // Check if we cross the left boundary x = rect.left
                        // Y must be within [rect.top + radius, rect.bottom - radius] approximately
                        // (simplified to rect.top to rect.bottom for now)
                        if (drop.x < rect.left && (drop.x + horizontalSpeed) >= rect.left) {
                            // Calculate intersection Y
                            // (rect.left - drop.x) / horizontalSpeed = (intersectY - drop.y) / drop.speed
                            const t = (rect.left - drop.x) / horizontalSpeed
                            const intersectY = drop.y + t * drop.speed
                            
                            if (intersectY >= rect.top + radius && intersectY <= rect.bottom - radius) {
                                collisionX = rect.left
                                collisionY = intersectY
                                hit = true
                                normal = { x: -1, y: 0 } // Pointing Left
                                break
                            }
                        }
                    }
                    // Wind from right (moving left) -> Hit Right Side
                    else if (horizontalSpeed < 0) {
                         // Check if we cross the right boundary x = rect.right
                        if (drop.x > rect.right && (drop.x + horizontalSpeed) <= rect.right) {
                            const t = (rect.right - drop.x) / horizontalSpeed
                            const intersectY = drop.y + t * drop.speed
                            
                            if (intersectY >= rect.top + radius && intersectY <= rect.bottom - radius) {
                                collisionX = rect.right
                                collisionY = intersectY
                                hit = true
                                normal = { x: 1, y: 0 } // Pointing Right
                                break
                            }
                        }
                    }
                }
            }
        }

        // Handle Reset or Splash
        if (hit || drop.y > canvas.height) {
          if (hit) {
            // Create splash
            splashesRef.current.push({
              x: collisionX,
              y: collisionY,
              age: 0,
              maxAge: 10 + Math.random() * 10,
              size: 1 + Math.random() * 2,
              normal: normal
            })
          }
          
          // Reset drop to top
          drop.y = -drop.length
          drop.x = Math.random() * canvas.width
        } else {
            // Draw drop with tilt
            // Calculate slant based on tangent to ensure uniform direction
            const slant = drop.length * windTangent
            
            ctx.moveTo(drop.x, drop.y)
            ctx.lineTo(drop.x + slant, drop.y + drop.length)
        }
      }
      ctx.stroke()

      // Update and Draw Splashes (only for front layer)
      if (layer === 'front') {
          for (let i = splashesRef.current.length - 1; i >= 0; i--) {
            const splash = splashesRef.current[i]
            splash.age++
            
            if (splash.age > splash.maxAge) {
              splashesRef.current.splice(i, 1)
              continue
            }

            const progress = splash.age / splash.maxAge
            const alpha = 1 - progress
            const currentSize = splash.size + progress * 2

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
            ctx.beginPath()
            
            // Draw splash based on normal
            // Rotate context to align with normal
            ctx.save()
            ctx.translate(splash.x, splash.y)
            
            // Calculate rotation angle from normal
            // We want the splash to be perpendicular to the normal vector
            // The ellipse is drawn horizontally (along x-axis) by default
            // So we need to rotate it so its "up" vector (minor axis) aligns with normal
            // or its "right" vector (major axis) is perpendicular to normal.
            
            // Normal angle
            const normalAngle = Math.atan2(splash.normal.y, splash.normal.x)
            // We want the flat part of splash (major axis) to be perpendicular to normal
            // So rotate by normalAngle + 90 deg (PI/2)
            const rotation = normalAngle + Math.PI / 2
            
            ctx.rotate(rotation)
            
            // Draw main splash oval
            // For side/corner hits, offset slightly out along normal to avoid clipping?
            // Already handled by collision point being on surface
            ctx.ellipse(0, 0, currentSize * 2, currentSize / 2, 0, 0, Math.PI * 2)
            ctx.fill()
            
            // Droplets flying out along normal
            const dropletCount = 3
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
            
            // Base angle in the ROTATED coordinate system
            // We rotated so that X axis is perpendicular to normal, Y axis is... wait.
            // If we rotated by normalAngle + 90:
            // The new X axis is tangent to surface.
            // The new Y axis is opposite to normal? Or along normal?
            // Let's stick to world coordinates for droplets calculation to avoid confusion, 
            // or assume we want droplets to fly "up" relative to the surface (which is along normal)
            
            // In rotated system:
            // Angle 0 is along tangent.
            // Angle -90 (-PI/2) is "up" relative to surface (along normal) if we rotated correctly?
            
            // Let's simpler: Use normalAngle directly for droplets base direction
            // And revert rotation for droplets drawing
            ctx.restore() // Restore to world coords
            
            const baseAngle = Math.atan2(splash.normal.y, splash.normal.x)
            
            for(let j=0; j<dropletCount; j++) {
                // Spread droplets around normal
                const spread = Math.PI / 2 // +/- 45 deg
                const angle = baseAngle + (Math.random() * spread - spread/2)
                
                const dist = progress * 10
                const dx = Math.cos(angle) * dist
                const dy = Math.sin(angle) * dist
                
                ctx.beginPath()
                ctx.arc(splash.x + dx, splash.y + dy, 0.5, 0, Math.PI * 2)
                ctx.fill()
            }
          }
      }

      requestRef.current = requestAnimationFrame(animate)
    }

    // Listen for scroll on the specific container
    const scrollContainer = document.getElementById('weather-scroll-container')
    
    // Use ResizeObserver for accurate size tracking
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(canvas)

    if (scrollContainer && layer === 'front') {
      scrollContainer.addEventListener('scroll', updateRects)
    }

    // Initial setup
    updateDimensions()
    initDrops()
    animate()

    return () => {
      resizeObserver.disconnect()
      if (scrollContainer && layer === 'front') {
        scrollContainer.removeEventListener('scroll', updateRects)
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [intensity, layer, windSpeed, windDirection])

  return (
    <canvas 
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${layer === 'front' ? 'z-20' : 'z-0'}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
