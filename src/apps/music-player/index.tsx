'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, ListMusic, Volume2, MoreHorizontal, ChevronDown } from 'lucide-react'

// Mock Data
const PLAYLIST = [
  {
    id: '1',
    title: 'Cyberpunk City',
    artist: 'Synthwave Boy',
    album: 'Neon Nights',
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3',
    cover: 'https://images.unsplash.com/photo-1535402803947-a950d5f71480?q=80&w=800&auto=format&fit=crop', // Cyberpunk neon
    color: '#4f46e5' // Indigo
  },
  {
    id: '2',
    title: 'Night Drive',
    artist: 'Neon Rider',
    album: 'Midnight Run',
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Kai_Engel/Satin/Kai_Engel_-_04_-_Sentinel.mp3',
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop', // Surfer/Sunset
    color: '#f97316' // Orange
  },
  {
    id: '3',
    title: 'Coding Flow',
    artist: 'Lo-Fi Beats',
    album: 'Focus Mode',
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Elipses.mp3',
    cover: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=800&auto=format&fit=crop', // Abstract
    color: '#06b6d4' // Cyan
  }
]

const MOCK_LYRICS = [
  { time: 0, text: "Instrumental Intro..." },
  { time: 5, text: "Neon lights flashing by" },
  { time: 10, text: "Driving through the city night" },
  { time: 15, text: "Synthesizers in the air" },
  { time: 20, text: "Cyberpunk is everywhere" },
  { time: 25, text: "..." },
  { time: 30, text: "(Music fades in)" },
  { time: 40, text: "Feel the rhythm, feel the beat" },
  { time: 50, text: "Echoes on the empty street" },
]

export default function MusicPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [mode, setMode] = useState<'loop' | 'shuffle'>('loop')
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const track = PLAYLIST[currentIndex]

  // Audio Handlers
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const changeTrack = (direction: 'next' | 'prev') => {
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (newIndex >= PLAYLIST.length) newIndex = 0
    if (newIndex < 0) newIndex = PLAYLIST.length - 1
    setCurrentIndex(newIndex)
    setIsPlaying(true)
  }

  // Auto-play when track changes
  useEffect(() => {
    if (isPlaying && audioRef.current) {
        audioRef.current.play()
    }
  }, [currentIndex])

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00"
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Find current lyric
  const currentLyricIndex = MOCK_LYRICS.findLastIndex(l => l.time <= currentTime)

  return (
    <div className="h-full w-full relative overflow-hidden bg-black font-sans select-none text-white/90">
      {/* Background Layer (Blur) */}
      <div className="absolute inset-0 z-0">
        <div 
            className="absolute inset-0 bg-center bg-cover transition-all duration-1000 ease-in-out opacity-60 scale-110 blur-3xl"
            style={{ backgroundImage: `url(${track.cover})` }}
        />
        <div className="absolute inset-0 bg-black/40" /> {/* Dim overlay */}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col pt-10 pb-6 px-6">
        
        {/* Header Area (Song Info) */}
        <div className="text-center mb-8 mt-2">
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md truncate px-8">{track.title}</h1>
            <p className="text-sm text-white/60 font-medium tracking-wide mt-1">{track.artist}</p>
        </div>

        {/* Vinyl Record Area */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">
            {/* Needle (Stylus) */}
            <motion.div 
                className="absolute top-[-20px] left-[55%] w-24 h-36 z-20 origin-top-left pointer-events-none drop-shadow-2xl"
                animate={{ rotate: isPlaying ? 0 : -25 }}
                transition={{ type: "spring", stiffness: 50, damping: 10 }}
            >
                 {/* Stylus Arm Graphic (CSS Drawing) */}
                 <div className="w-1.5 h-4 bg-gray-400 absolute top-0 left-0 rounded-full" /> {/* Pivot */}
                 <div className="w-1 h-24 bg-gradient-to-b from-gray-300 to-gray-500 absolute top-2 left-0.5 origin-top rotate-[-15deg]" /> {/* Arm */}
                 <div className="w-3 h-5 bg-gray-300 absolute bottom-8 left-[-8px] rounded-sm shadow-md rotate-[-15deg]" /> {/* Head */}
            </motion.div>

        {/* Vinyl Disc */}
        <div className="relative w-64 h-64 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.6)] border-4 border-white/5 bg-[#1a1a1a]">
             {/* Continuous Spin Animation */}
             <div 
                className="w-full h-full rounded-full overflow-hidden relative animate-[spin_20s_linear_infinite]"
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
             >
                 {/* Vinyl Texture Rings */}
                 <div className="absolute inset-0 rounded-full border-[10px] border-[#111]" />
                 <div className="absolute inset-2 rounded-full border border-white/10" />
                 <div className="absolute inset-4 rounded-full border border-white/5" />
                 
                 {/* Album Art (Center Label) */}
                 <div className="absolute inset-[25%] rounded-full overflow-hidden border-2 border-[#111] shadow-inner">
                    <img src={track.cover} className="w-full h-full object-cover" alt="cover" />
                 </div>
            </div>
        </div>
    </div>

    {/* Lyrics Snippet */}
    <div 
        className="h-16 flex items-center justify-center text-center my-4 overflow-hidden"
        style={{ maskImage: 'linear-gradient(transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, black 20%, black 80%, transparent)' }}
    >
        <AnimatePresence mode="wait">
                <motion.p
                    key={currentLyricIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-white/80 text-base font-medium drop-shadow-sm px-4 leading-tight"
                >
                    {MOCK_LYRICS[currentLyricIndex]?.text || "..."}
                </motion.p>
            </AnimatePresence>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col gap-4">
            {/* Actions Row */}
            <div className="flex justify-between items-center px-4 text-white/70">
                <button className="hover:text-white transition-colors"><Heart size={22} /></button>
                <button className="hover:text-white transition-colors"><Volume2 size={22} /></button>
                <button className="hover:text-white transition-colors"><MoreHorizontal size={22} /></button>
            </div>

            {/* Progress Bar */}
            <div className="w-full group cursor-pointer" onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect()
                 const p = (e.clientX - rect.left) / rect.width
                 if(audioRef.current) audioRef.current.currentTime = p * (duration || 100)
            }}>
                <div className="flex justify-between text-xs text-white/50 font-medium mb-1.5 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main Buttons */}
            <div className="flex items-center justify-between px-2 mt-2">
                <button 
                    onClick={() => setMode(mode === 'loop' ? 'shuffle' : 'loop')}
                    className="text-white/50 hover:text-white transition-colors p-2"
                >
                    {mode === 'loop' ? <Repeat size={20} /> : <Shuffle size={20} />}
                </button>

                <button onClick={() => changeTrack('prev')} className="text-white hover:text-cyan-400 transition-colors p-2">
                    <SkipBack size={28} fill="currentColor" className="opacity-90" />
                </button>

                <button 
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 border border-white/10 backdrop-blur-md shadow-lg"
                >
                    {isPlaying ? (
                        <Pause size={32} fill="currentColor" className="text-white" />
                    ) : (
                        <Play size={32} fill="currentColor" className="text-white ml-1" />
                    )}
                </button>

                <button onClick={() => changeTrack('next')} className="text-white hover:text-cyan-400 transition-colors p-2">
                    <SkipForward size={28} fill="currentColor" className="opacity-90" />
                </button>

                <button 
                    onClick={() => setShowPlaylist(true)}
                    className="text-white/50 hover:text-white transition-colors p-2"
                >
                    <ListMusic size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* Playlist Overlay (Bottom Sheet) */}
      <AnimatePresence>
        {showPlaylist && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPlaylist(false)}
                    className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute bottom-0 left-0 right-0 h-[60%] bg-[#1a1a1a] rounded-t-3xl z-50 overflow-hidden flex flex-col shadow-2xl border-t border-white/10"
                >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">Current Queue</span>
                            <span className="text-sm text-white/50">({PLAYLIST.length})</span>
                        </div>
                        <button onClick={() => setShowPlaylist(false)} className="p-1 hover:bg-white/10 rounded-full">
                            <ChevronDown size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2">
                        {PLAYLIST.map((t, i) => (
                            <div 
                                key={t.id}
                                onClick={() => {
                                    setCurrentIndex(i)
                                    setIsPlaying(true)
                                }}
                                className={`p-3 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group ${currentIndex === i ? 'bg-white/10' : ''}`}
                            >
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                    <img src={t.cover} className="w-full h-full object-cover" alt="" />
                                    {currentIndex === i && isPlaying && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-1 h-3 bg-cyan-400 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${currentIndex === i ? 'text-cyan-400' : 'text-white'}`}>{t.title}</div>
                                    <div className="text-xs text-white/50 truncate">{t.artist} - {t.album}</div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-2 hover:text-cyan-400 text-white/50">
                                    <Play size={14} fill="currentColor" />
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef}
        src={track.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => changeTrack('next')}
      />
    </div>
  )
}
