'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, Radio, Activity } from 'lucide-react'
import { soundManager } from '@/lib/sound'

// Using reliable, royalty-free tracks suitable for background/coding
// Note: These URLs are examples. For production, host these files on your own CDN.
const TRACKS = [
  { 
    id: 1, 
    title: "NIGHT_DRIFT", 
    artist: "CYBER_FM", 
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3"
  },
  { 
    id: 2, 
    title: "NEON_ARPS", 
    artist: "SYNTH_CORE", 
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipsis.mp3" 
  },
  { 
    id: 3, 
    title: "DIGITAL_RAIN", 
    artist: "NET_RUNNER", 
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/KieLoKaz/Free_Ganymed/KieLoKaz_-_01_-_Reunion_of_the_Spirits_ID_211.mp3" 
  },
  { 
    id: 4, 
    title: "VOID_SIGNAL", 
    artist: "DEEP_SPACE", 
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Lobo_Loco/Vapor/Lobo_Loco_-_01_-_Max_Bhardwaj_-_Vapor.mp3" 
  }
]

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function RadioDeck() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [volume, setVolume] = useState(75)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  // Initialize Audio Engine
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioContextClass()
    
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume / 100
    
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128 // Better resolution for music

    masterGain.connect(analyser)
    analyser.connect(ctx.destination)

    // Create Audio Element
    const audio = new Audio()
    audio.crossOrigin = "anonymous" // Crucial for CORS visualizer support
    audio.src = TRACKS[currentTrack].src
    audio.loop = true
    
    // Connect Audio Element to Web Audio API
    try {
       const source = ctx.createMediaElementSource(audio)
       source.connect(masterGain)
       sourceRef.current = source
    } catch (e) {
       console.warn("CORS blocked audio visualization. Playing audio directly.", e)
       // Fallback: just play audio without visualizer connection if CORS fails
       // But usually with anonymous crossOrigin it works for FMA
    }

    // Event Listeners
    audio.addEventListener('timeupdate', () => {
       if (!isDragging) setCurrentTime(audio.currentTime)
    })
    
    audio.addEventListener('loadedmetadata', () => {
       setDuration(audio.duration)
    })

    audio.addEventListener('ended', () => {
       changeTrack('next')
    })

    audioCtxRef.current = ctx
    masterGainRef.current = masterGain
    analyserRef.current = analyser
    audioRef.current = audio
  }, [currentTrack, isDragging]) // Re-init not needed usually, but logic below handles updates

  // Handle Track Changes (Effect)
  useEffect(() => {
    if (audioRef.current) {
       const audio = audioRef.current
       const wasPlaying = !audio.paused
       
       if (audio.src !== TRACKS[currentTrack].src) {
          audio.src = TRACKS[currentTrack].src
          audio.load()
          if (wasPlaying || isPlaying) {
             const playPromise = audio.play()
             if (playPromise !== undefined) {
                playPromise.catch(error => {
                   console.error("Playback failed:", error)
                   setIsPlaying(false)
                })
             }
          }
       }
    }
  }, [currentTrack])

  // Handle Play/Pause
  const togglePlay = () => {
    soundManager.playClick()
    
    if (!audioCtxRef.current) initAudio()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()

    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
          playPromise.catch(error => {
             console.error("Playback failed:", error)
          })
      }
    }
    setIsPlaying(!isPlaying)
  }

  // Moved Visualizer Loop State below drawVisualizer definition

  // Handle Track Change Control
  const changeTrack = (direction: 'next' | 'prev') => {
    soundManager.playClick()
    let nextIndex = direction === 'next' 
      ? (currentTrack + 1) % TRACKS.length 
      : (currentTrack - 1 + TRACKS.length) % TRACKS.length
    
    setCurrentTrack(nextIndex)
  }

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newTime = Number(e.target.value)
     setCurrentTime(newTime)
     if (audioRef.current) {
        audioRef.current.currentTime = newTime
     }
  }

  // Visualizer Loop
  const drawVisualizer = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const render = () => {
      if (!analyserRef.current) return
      analyserRef.current.getByteFrequencyData(dataArray)

      // Check if we have active data, otherwise simulate (fallback for CORS/Silence)
      const hasData = dataArray.some(val => val > 0)
      if (!hasData && isPlaying) {
         // Simulate spectrum based on volume and random noise
         for (let i = 0; i < bufferLength; i++) {
            // Create a fake "beat" effect using time
            const time = Date.now() / 200
            const wave = Math.sin(i * 0.2 + time) * 0.5 + 0.5
            // Add some noise and scale by volume
            const value = (Math.random() * 0.3 + wave * 0.7) * (volume / 100) * 200
            dataArray[i] = value
         }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      // Gradient
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
      gradient.addColorStop(0, '#f97316') // Orange-500
      gradient.addColorStop(1, '#fbbf24') // Amber-400

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.9
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        // Reflection
        ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'
        ctx.fillRect(x, canvas.height, barWidth, barHeight * 0.5)

        x += barWidth + 2
      }

      if (isPlaying) {
         animationRef.current = requestAnimationFrame(render)
      }
    }
    render()
  }, [isPlaying, volume])

  // Handle Visualizer Loop State (Must be after drawVisualizer definition)
  useEffect(() => {
    if (isPlaying) {
      drawVisualizer()
    } else {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, drawVisualizer])

  // Volume Effect
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume / 100, audioCtxRef.current?.currentTime || 0)
    }
  }, [volume])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
         audioRef.current.pause()
         audioRef.current.src = ""
      }
      cancelAnimationFrame(animationRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col gap-6 p-4 font-mono text-white/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-sm">
             <Radio size={20} className="text-orange-500" />
          </div>
          <div>
            <div className="text-xs tracking-widest text-orange-500">FREQUENCY_MOD</div>
            <div className="text-lg font-bold tracking-wider">104.5 MHz</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`} />
           <span className="text-[10px] tracking-widest opacity-60">{isPlaying ? 'BROADCASTING' : 'STANDBY'}</span>
        </div>
      </div>

      {/* Main Visualizer (Canvas) */}
      <div className="flex-1 border border-white/10 bg-black/40 relative overflow-hidden flex items-end justify-center p-4 min-h-[150px]">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1)_0%,transparent_70%)]" />
         
         {/* Grid Background */}
         <div 
            className="absolute inset-0 opacity-10"
            style={{ 
              backgroundImage: 'linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} 
         />

         <canvas 
            ref={canvasRef} 
            width={300} 
            height={150} 
            className="w-full h-full relative z-10"
         />
      </div>

      {/* Track Info */}
      <div className="space-y-2">
         <div className="flex justify-between items-end">
            <div>
               <div className="text-xs text-white/40 mb-1">NOW_PLAYING</div>
               <div className="text-xl font-bold text-orange-400 truncate max-w-[250px]">
                 {TRACKS[currentTrack].title}
               </div>
               <div className="text-sm text-white/60">{TRACKS[currentTrack].artist}</div>
            </div>
            <div className="text-2xl font-mono text-white/20">
              0{currentTrack + 1}
            </div>
         </div>
         
         {/* Interactive Progress Bar */}
         <div className="group relative h-4 w-full flex items-center cursor-pointer mt-2">
            {/* Background Track */}
            <div className="absolute w-full h-1 bg-white/10 group-hover:bg-white/20 transition-colors" />
            
            {/* Fill */}
            <div 
               className="absolute h-1 bg-orange-500" 
               style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Input Range (Hidden but interactive) */}
            <input
               type="range"
               min={0}
               max={duration || 100}
               value={currentTime}
               onChange={handleSeek}
               onMouseDown={() => setIsDragging(true)}
               onMouseUp={() => setIsDragging(false)}
               onTouchStart={() => setIsDragging(true)}
               onTouchEnd={() => setIsDragging(false)}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {/* Thumb (Visual Only) */}
            <div 
               className="absolute w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] pointer-events-none transition-transform group-hover:scale-125"
               style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
            />
         </div>

         <div className="flex justify-between text-[10px] text-white/30 font-mono mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
         </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-auto">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => changeTrack('prev')}
              className="p-3 border border-white/10 hover:bg-white/5 hover:border-orange-500/50 text-white/60 hover:text-orange-400 transition-colors"
            >
               <SkipBack size={20} />
            </button>
            
            <button 
              onClick={togglePlay}
              className="p-4 border border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]"
            >
               {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            <button 
              onClick={() => changeTrack('next')}
              className="p-3 border border-white/10 hover:bg-white/5 hover:border-orange-500/50 text-white/60 hover:text-orange-400 transition-colors"
            >
               <SkipForward size={20} />
            </button>
         </div>

         {/* Volume Control */}
         <div className="flex items-center gap-3 w-1/3 group">
            <button 
               onClick={() => setVolume(v => v === 0 ? 75 : 0)}
               className="text-white/40 hover:text-orange-400 transition-colors"
            >
               <Volume2 size={16} />
            </button>
            
            <div className="relative h-6 flex-1 flex items-center">
               {/* Track */}
               <div className="absolute w-full h-1 bg-white/10 group-hover:bg-white/20 transition-colors" />
               
               {/* Fill */}
               <div 
                  className="absolute h-1 bg-white/40 group-hover:bg-orange-500/80 transition-colors" 
                  style={{ width: `${volume}%` }} 
               />
               
               {/* Input */}
               <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               
               {/* Thumb */}
               <div 
                  className="absolute w-2 h-4 bg-orange-500 pointer-events-none transition-transform group-hover:scale-110"
                  style={{ left: `calc(${volume}% - 4px)` }}
               />
            </div>
         </div>
      </div>
    </div>
  )
}
