import { useEffect, useRef, useState } from 'react'

export const useAudioSystem = (audioRef: React.RefObject<HTMLAudioElement>) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const filtersRef = useRef<BiquadFilterNode[]>([])
  
  // Initialize Audio System
  useEffect(() => {
    if (!audioRef.current) return

    // Create Context if needed
    if (!audioContextRef.current) {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext)
        audioContextRef.current = new AudioContextClass()
    }
    
    const ctx = audioContextRef.current

    // Create Analyser
    if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser()
        analyserRef.current.fftSize = 2048 // Higher res for better visualizer
        analyserRef.current.smoothingTimeConstant = 0.8
    }

    // Create Filters (7 bands matching Equalizer UI)
    // [60, 170, 310, 600, 1000, 3000, 6000]
    if (filtersRef.current.length === 0) {
        const frequencies = [60, 170, 310, 600, 1000, 3000, 6000]
        filtersRef.current = frequencies.map((freq, i) => {
            const filter = ctx.createBiquadFilter()
            if (i === 0) filter.type = 'lowshelf'
            else if (i === frequencies.length - 1) filter.type = 'highshelf'
            else filter.type = 'peaking'
            
            filter.frequency.value = freq
            filter.Q.value = 1
            filter.gain.value = 0
            return filter
        })
    }

    // Create Source & Connect Graph
    // Source -> F1 -> F2 ... -> F7 -> Analyser -> Destination
    const connectGraph = () => {
        if (!audioRef.current || sourceRef.current) return // Already connected or no audio

        try {
            sourceRef.current = ctx.createMediaElementSource(audioRef.current)
            
            let currentNode: AudioNode = sourceRef.current
            
            // Chain filters
            filtersRef.current.forEach(filter => {
                currentNode.connect(filter)
                currentNode = filter
            })

            // Connect to Analyser
            currentNode.connect(analyserRef.current!)
            
            // Connect to Output
            analyserRef.current!.connect(ctx.destination)
            
            console.log("Audio Graph Connected Successfully")
        } catch (e) {
            console.error("Failed to connect audio graph:", e)
        }
    }

    // Attempt connection immediately if audio exists, or retry on interaction
    connectGraph()

    // Resume context on user interaction if suspended
    const resumeContext = () => {
        if (ctx.state === 'suspended') {
            ctx.resume()
        }
    }
    
    document.addEventListener('click', resumeContext)
    return () => document.removeEventListener('click', resumeContext)
  }, [audioRef])

  // Update Filter Gains
  const setFilterGain = (index: number, value: number) => {
      if (filtersRef.current[index]) {
          filtersRef.current[index].gain.value = value
      }
  }

  return {
      analyser: analyserRef.current,
      setFilterGain
  }
}
