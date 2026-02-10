import React, { useEffect, useRef } from 'react'

interface VisualizerProps {
  analyser: AnalyserNode | null
  isPlaying: boolean
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!canvasRef.current || !analyser) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!ctx) return
      animationRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear with slight transparency for trail effect? No, clean clear for crispness
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw background
      // ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      // ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const barWidth = (canvas.width / bufferLength) * 2
      let barHeight
      let x = 0

      // Mirrored Visualization
      for (let i = 0; i < bufferLength; i++) {
        // Logarithmic scale for better bass visualization
        barHeight = (dataArray[i] / 255) * (canvas.height * 0.8)
        
        // Dynamic Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#10b981') // Emerald-500
        gradient.addColorStop(0.5, '#06b6d4') // Cyan-500
        gradient.addColorStop(1, '#8b5cf6') // Violet-500
        
        ctx.fillStyle = gradient

        // Draw Right Side
        ctx.fillRect(centerX + x, (canvas.height - barHeight) / 2, barWidth, barHeight)
        
        // Draw Left Side
        ctx.fillRect(centerX - x - barWidth, (canvas.height - barHeight) / 2, barWidth, barHeight)

        x += barWidth + 1
        
        // Optimization: Stop drawing high frequencies if off-screen (though mirroring makes this tricky)
        if (x > centerX) break
      }
    }

    if (isPlaying) {
        draw()
    } else {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        // Draw one last frame (flat) or clear
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [analyser, isPlaying])

  return (
    <canvas 
        ref={canvasRef} 
        width={600} 
        height={200} 
        className="w-full h-full rounded opacity-90"
    />
  )
}
