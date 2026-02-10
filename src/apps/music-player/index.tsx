'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, 
  ListMusic, Volume2, MoreHorizontal, ChevronLeft, ChevronRight, 
  Search, Download, Clock, Disc, Mic2, LayoutGrid, Settings, 
  RefreshCw, Layers, MonitorSpeaker, ChevronUp, ChevronDown, Maximize2,
  Trash2, Plus
} from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'

import { Visualizer } from './components/Visualizer'
import { Equalizer } from './components/Equalizer'
import { useAudioSystem } from './hooks/useAudioSystem'

// Real Sample Data (SoundHelix)
const INITIAL_TRACKS = [
  {
    id: '1',
    title: 'Daily 30',
    artist: 'SoundHelix',
    album: 'Ambient Works',
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372
  },
  {
    id: '2',
    title: 'Neon Nights',
    artist: 'Cyberwave',
    album: 'Future City',
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 420
  },
  {
    id: '3',
    title: 'Code & Chill',
    artist: 'DevBeats',
    album: 'Focus Mode',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 320
  },
  {
    id: '4',
    title: 'Midnight Drive',
    artist: 'SynthHero',
    album: 'Retrowave',
    cover: 'https://images.unsplash.com/photo-1504509546545-e000b4a62901?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 300
  },
  {
    id: '5',
    title: 'Ocean Breeze',
    artist: 'Coastal Vibe',
    album: 'Summer Days',
    cover: 'https://images.unsplash.com/photo-1515405295579-ba7b45490915?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: 340
  },
  {
    id: '6',
    title: 'Deep Focus',
    artist: 'Mindset',
    album: 'Flow State',
    cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: 290
  },
  {
    id: '7',
    title: 'Electric Dreams',
    artist: 'Pulse',
    album: 'Digital Love',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration: 310
  },
  {
    id: '8',
    title: 'Mountain Echo',
    artist: 'Nature Sounds',
    album: 'Earth',
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration: 280
  },
  {
    id: '9',
    title: 'Piano Solitude',
    artist: 'Classical Minds',
    album: 'Keys',
    cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration: 330
  },
  {
    id: '10',
    title: 'Cyber Funk',
    artist: 'Groove Bot',
    album: 'Future Funk',
    cover: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    duration: 360
  },
  {
    id: '11',
    title: 'Lost in Space',
    artist: 'Star Walker',
    album: 'Galaxy',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    duration: 400
  },
  {
    id: '12',
    title: 'Urban Flow',
    artist: 'City Life',
    album: 'Metropolis',
    cover: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    duration: 350
  },
  {
    id: '13',
    title: 'Morning Coffee',
    artist: 'Acoustic Soul',
    album: 'Wake Up',
    cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    duration: 240
  },
  {
    id: '14',
    title: 'Retro Arcade',
    artist: 'Bit Master',
    album: 'Level 1',
    cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
    duration: 180
  },
  {
    id: '15',
    title: 'Sunset Blvd',
    artist: 'Pop Star',
    album: 'Dreams',
    cover: 'https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    duration: 210
  },
  {
    id: '16',
    title: 'Night Owl',
    artist: 'Jazz Quartet',
    album: 'Blue Note',
    cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
    duration: 390
  }
]

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MusicPlayer() {
  const { t } = useLanguage()

  // Playlist State
  interface Playlist {
    id: string
    name: string
    tracks: any[]
  }

  const [playlists, setPlaylists] = useState<Playlist[]>([])

  // State
  const [playlist, setPlaylist] = useState(INITIAL_TRACKS)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [activeTab, setActiveTab] = useState('recommend')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  
  // Optimization State
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [isShuffled, setIsShuffled] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, track: any} | null>(null)

  // iTunes Search State
  const [onlineTracks, setOnlineTracks] = useState<any[]>([])
  const [isSearchingOnline, setIsSearchingOnline] = useState(false)

  // EQ State
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000]

  const audioRef = useRef<HTMLAudioElement>(null)
  const { analyser, setFilterGain } = useAudioSystem(audioRef)
  const currentTrack = playlist[currentTrackIndex] || playlist[0]

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('music-player-state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.liked) setLiked(parsed.liked)
        if (parsed.volume) setVolume(parsed.volume)
        if (parsed.playlist && Array.isArray(parsed.playlist)) setPlaylist(parsed.playlist)
        if (parsed.currentTrackIndex) setCurrentTrackIndex(parsed.currentTrackIndex)
        if (parsed.repeatMode) setRepeatMode(parsed.repeatMode)
        if (parsed.isShuffled) setIsShuffled(parsed.isShuffled)
        if (parsed.playlists) setPlaylists(parsed.playlists)
      } catch (e) { console.error("Failed to load state", e) }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('music-player-state', JSON.stringify({
      liked,
      volume,
      playlist: playlist.length > INITIAL_TRACKS.length ? playlist : undefined,
      currentTrackIndex,
      repeatMode,
      isShuffled,
      playlists
    }))
  }, [liked, volume, playlist, currentTrackIndex, repeatMode, isShuffled, playlists])

  // Playlist Management
  const handleCreatePlaylist = () => {
    const name = prompt('Enter playlist name:')
    if (name) {
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name,
        tracks: []
      }
      setPlaylists(prev => [...prev, newPlaylist])
      setActiveTab(newPlaylist.id)
    }
  }

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this playlist?')) {
      setPlaylists(prev => prev.filter(p => p.id !== id))
      if (activeTab === id) setActiveTab('recommend')
    }
  }

  const addToPlaylist = (playlistId: string, track: any) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.tracks.find(t => t.id === track.id)) return p
        return { ...p, tracks: [...p.tracks, track] }
      }
      return p
    }))
    setContextMenu(null)
  }

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) }
      }
      return p
    }))
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'search' && document.activeElement?.tagName === 'INPUT') return
      
      switch(e.code) {
         case 'Space': 
            e.preventDefault(); togglePlay(); break;
         case 'ArrowLeft': 
            if (e.metaKey || e.ctrlKey) playPrev(); 
            else if (audioRef.current) audioRef.current.currentTime -= 5; 
            break;
         case 'ArrowRight':
            if (e.metaKey || e.ctrlKey) playNext();
            else if (audioRef.current) audioRef.current.currentTime += 5;
            break;
         case 'ArrowUp':
            e.preventDefault(); setVolume(v => Math.min(1, v + 0.1)); break;
         case 'ArrowDown':
            e.preventDefault(); setVolume(v => Math.max(0, v - 0.1)); break;
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, activeTab, volume, playlist, currentTrackIndex, isShuffled, repeatMode])

  // Audio Effects
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Playback failed:", e))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentTrackIndex]) // Removed playlist dep to prevent restart on list change

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime
      const dur = audioRef.current.duration
      setCurrentTime(curr)
      setDuration(dur || 0)
      setProgress(dur > 0 ? (curr / dur) * 100 : 0)
    }
  }

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
       if (audioRef.current) {
         audioRef.current.currentTime = 0
         audioRef.current.play()
       }
    } else {
       playNext(true)
    }
  }

  // Controls
  const togglePlay = () => setIsPlaying(prev => !prev)
  const toggleShuffle = () => setIsShuffled(prev => !prev)
  const toggleRepeat = () => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')

  // EQ Change Handler
  const handleEqChange = (index: number, value: number) => {
      const newGains = [...eqGains]
      newGains[index] = value
      setEqGains(newGains)
      setFilterGain(index, value)
  }
  
  const getNextIndex = () => {
    if (isShuffled) {
      let nextIndex = Math.floor(Math.random() * playlist.length)
      while (nextIndex === currentTrackIndex && playlist.length > 1) {
        nextIndex = Math.floor(Math.random() * playlist.length)
      }
      return nextIndex
    }
    return (currentTrackIndex + 1) % playlist.length
  }

  const playNext = (auto = false) => {
    setCurrentTrackIndex(getNextIndex())
    setIsPlaying(true)
  }

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length)
    }
    setIsPlaying(true)
  }

  const playTrack = (track: any) => {
    // Check if track is in playlist
    const index = playlist.findIndex(t => t.id === track.id)
    if (index !== -1) {
      setCurrentTrackIndex(index)
    } else {
      // Add to playlist and play
      const newPlaylist = [...playlist, track]
      setPlaylist(newPlaylist)
      setCurrentTrackIndex(newPlaylist.length - 1)
    }
    setIsPlaying(true)
  }
  
  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'))
    if (files.length > 0) {
        const newTracks = files.map(f => ({
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: f.name.replace(/\.[^/.]+$/, ""),
            artist: t('music.localfile'),
            album: t('music.uploads'),
            cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop',
            url: URL.createObjectURL(f),
            duration: 0,
            isLocal: true
        }))
        setPlaylist(prev => [...prev, ...newTracks])
        playTrack(newTracks[0])
        setActiveTab('local')
    }
  }

  const handleDeleteTrack = (id: string) => {
    const newPlaylist = playlist.filter(t => t.id !== id)
    setPlaylist(newPlaylist)
    if (currentTrack.id === id) {
       playNext()
    }
    setContextMenu(null)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = (val / 100) * audioRef.current.duration
      setProgress(val)
    }
  }

  const toggleLike = (id: string) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        if (activeTab !== 'search') setActiveTab('search')
        searchiTunes(searchQuery)
      } else {
        if (activeTab === 'search') setActiveTab('recommend')
        setOnlineTracks([])
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchiTunes = async (term: string) => {
    if (!term) return
    setIsSearchingOnline(true)
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=24`)
      const data = await res.json()
      
      const results = data.results.map((item: any) => ({
        id: 'itunes-' + item.trackId,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
        url: item.previewUrl,
        duration: Math.round(item.trackTimeMillis / 1000),
        isOnline: true
      }))
      setOnlineTracks(results)
    } catch (e) {
      console.error("iTunes Search failed:", e)
    } finally {
      setIsSearchingOnline(false)
    }
  }

  // Components
  const SidebarItem = ({ icon: Icon, label, id, count }: any) => (
    <div 
      onClick={() => setActiveTab(id || label.toLowerCase())}
      className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
        activeTab === (id || label.toLowerCase()) 
          ? 'bg-[#1DB954]/10 text-[#1DB954]' 
          : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count && <span className="text-xs text-gray-600">{count}</span>}
    </div>
  )

  return (
    <div 
      className="h-full w-full flex flex-col bg-[#1e1e1e] text-[#e0e0e0] font-sans overflow-hidden select-none relative pt-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setContextMenu(null)}
    >
      <audio 
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
        onLoadedMetadata={handleTimeUpdate}
        crossOrigin="anonymous"
      />

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-emerald-500/20 backdrop-blur-sm border-4 border-emerald-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none"
          >
            <div className="text-3xl font-bold text-white drop-shadow-md">{t('music.drop')}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-56 bg-[#181818] flex flex-col pt-6 pb-2 border-r border-[#2c2c2c] shrink-0">
          
          {/* User Profile */}
          <div className="px-5 mb-8 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-[2px]">
               <img 
                 src="https://github.com/shadcn.png" 
                 className="w-full h-full rounded-full border-2 border-[#181818]"
                 alt="Avatar"
               />
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-bold text-white">Yume</span>
               <span className="text-[10px] text-emerald-400 border border-emerald-400/30 px-1 rounded-sm w-fit">{t('music.vip')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 px-3 mb-6">
             <SidebarItem icon={LayoutGrid} label={t('music.recommend')} id="recommend" />
             <SidebarItem icon={Disc} label={t('music.hall')} id="hall" />
             <SidebarItem icon={MonitorSpeaker} label={t('music.video')} id="video" />
             <SidebarItem icon={Layers} label={t('music.radio')} id="radio" />
             <SidebarItem icon={Sliders} label={t('music.eq')} id="eq" />
          </div>

          <div className="px-5 text-xs text-gray-500 font-medium mb-2">{t('music.my')}</div>
          <div className="flex flex-col gap-1 px-3 mb-6">
             <SidebarItem icon={Heart} label={t('music.likes')} id="likes" count={Object.values(liked).filter(Boolean).length} />
             <SidebarItem icon={Clock} label={t('music.recent')} id="recent" count="12" />
             <SidebarItem icon={Download} label={t('music.local')} id="local" />
          </div>

          <div className="px-5 text-xs text-gray-500 font-medium mb-2 flex justify-between items-center group cursor-pointer" onClick={handleCreatePlaylist}>
            <span>{t('music.playlists')}</span>
            <span className="opacity-0 group-hover:opacity-100 text-lg leading-none hover:text-white transition-colors">+</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
            {playlists.map((pl) => (
                <div 
                  key={pl.id} 
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer text-sm transition-colors group relative ${activeTab === pl.id ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveTab(pl.id)}
                >
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0">
                        <ListMusic size={14} />
                    </div>
                    <span className="truncate flex-1">{pl.name}</span>
                    <button 
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                      onClick={(e) => handleDeletePlaylist(pl.id, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
          
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex gap-2 text-gray-400">
                    <button className="hover:text-white"><ChevronLeft size={20} /></button>
                    <button className="hover:text-white"><ChevronRight size={20} /></button>
                </div>
                <button className="hover:animate-spin text-gray-400 hover:text-white ml-2">
                    <RefreshCw size={16} />
                </button>
                
                <div className="relative ml-4 group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          if (e.target.value) setActiveTab('hall')
                        }}
                        placeholder={t('music.search')}
                        className="bg-[#2a2a2a] text-sm text-white rounded-full pl-10 pr-4 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 text-gray-400">
                <button className="hover:text-white"><Mic2 size={18} /></button>
                <button className="hover:text-white"><Settings size={18} /></button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            
            {activeTab === 'recommend' && (
              <>
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    {t('start.visitor')} <span className="text-lg font-normal text-gray-500">{t('music.recommend')}</span>
                </h1>

                {/* Hero Banner */}
                <div className="w-full h-48 rounded-xl bg-gradient-to-r from-emerald-900/40 to-black relative overflow-hidden mb-8 group cursor-pointer border border-white/5" onClick={() => playTrack(INITIAL_TRACKS[0])}>
                    <div className="absolute inset-0 flex items-center p-8">
                        <div className="relative z-10">
                            <div className="text-emerald-400 font-medium mb-2 tracking-wider text-sm">{t('music.daily')}</div>
                            <h2 className="text-3xl font-bold text-white mb-4 w-2/3 leading-tight">{t('music.fresh')}</h2>
                            <button className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center hover:scale-105 transition-transform text-black">
                                <Play size={20} fill="currentColor" className="ml-1" />
                            </button>
                        </div>
                        <img 
                            src={INITIAL_TRACKS[0].cover}
                            className="absolute right-0 top-0 h-full w-2/3 object-cover mask-image-linear-fade opacity-60 group-hover:scale-105 transition-transform duration-700"
                            alt="Banner"
                        />
                    </div>
                </div>

                {/* Grid Section */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold text-white">{t('music.your_playlist')}</h3>
                        <button className="text-xs text-gray-500 hover:text-white transition-colors">{t('music.show_all')}</button>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-5">
                        {INITIAL_TRACKS.map((item, index) => (
                            <div key={item.id} className="group cursor-pointer" onClick={() => playTrack(item)}>
                                <div className="aspect-square rounded-lg overflow-hidden relative mb-3 bg-[#2a2a2a]">
                                    <img src={item.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title} />
                                    {/* Play Overlay */}
                                    <div className={`absolute inset-0 bg-black/20 transition-opacity flex items-center justify-center backdrop-blur-[1px] ${currentTrackIndex === index && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            {currentTrackIndex === index && isPlaying ? (
                                              <Pause size={24} fill="black" className="text-black" />
                                            ) : (
                                              <Play size={24} fill="black" className="ml-1 text-black" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-sm font-medium truncate transition-colors ${currentTrackIndex === index ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'}`}>{item.title}</div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">{item.artist}</div>
                            </div>
                        ))}
                    </div>
                </div>
              </>
            )}

            {activeTab === 'search' && (
              <div className="flex flex-col">
                 <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                   iTunes Search: "{searchQuery}"
                   {isSearchingOnline && <RefreshCw size={20} className="animate-spin text-emerald-500" />}
                 </h1>
                 <div className="grid grid-cols-4 gap-4">
                   {onlineTracks.map((track) => (
                     <div key={track.id} className="bg-[#2a2a2a]/50 p-4 rounded-lg hover:bg-[#2a2a2a] group cursor-pointer transition-colors" onClick={() => playTrack(track)}>
                       <div className="aspect-square rounded-md overflow-hidden relative mb-3 bg-black">
                         <img src={track.cover} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                             <Play size={20} fill="currentColor" className="ml-1" />
                           </div>
                         </div>
                         <div className="absolute bottom-1 right-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">30s</div>
                       </div>
                       <div className="font-medium text-white truncate">{track.title}</div>
                       <div className="text-xs text-gray-400 truncate">{track.artist}</div>
                       <div className="text-xs text-gray-500 truncate mt-1">{track.album}</div>
                     </div>
                   ))}
                   {!isSearchingOnline && onlineTracks.length === 0 && (
                     <div className="col-span-4 text-center text-gray-500 py-10">
                       No results found
                     </div>
                   )}
                 </div>
              </div>
            )}

            {(activeTab === 'hall' || activeTab === 'likes' || activeTab === 'local' || activeTab.startsWith('playlist-')) && (
               <div className="flex flex-col">
                  <h1 className="text-2xl font-bold mb-6">
                    {activeTab === 'hall' ? 'Music Hall' : activeTab === 'likes' ? 'Liked Songs' : activeTab === 'local' ? 'Local Files' : playlists.find(p => p.id === activeTab)?.name || 'Playlist'}
                  </h1>

                  {activeTab === 'local' && playlist.filter(t => t.isLocal).length === 0 && (
                     <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/20">
                        <Download size={48} className="mb-4 opacity-50" />
                        <p>Drag and drop audio files here</p>
                    </div>
                  )}

                  <div className="flex flex-col">
                    {(activeTab.startsWith('playlist-') 
                        ? (playlists.find(p => p.id === activeTab)?.tracks || [])
                        : playlist.filter(t => {
                            if (activeTab === 'likes' && !liked[t.id]) return false
                            if (activeTab === 'local' && !t.isLocal) return false
                            if (activeTab === 'hall' && (t.isLocal || t.isOnline)) return false
                            return true
                          })
                    ).map((track, i) => {
                      const realIndex = playlist.findIndex(p => p.id === track.id)
                      const isCurrent = currentTrackIndex === realIndex && realIndex !== -1
                      return (
                        <div key={`${track.id}-${i}`} 
                          className={`flex items-center gap-4 p-3 rounded-md hover:bg-[#2a2a2a] group cursor-pointer ${isCurrent ? 'bg-[#2a2a2a]' : ''}`}
                          onClick={() => playTrack(track)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({ x: e.clientX, y: e.clientY, track })
                          }}
                        >
                          <div className="w-6 text-center text-sm text-gray-500">
                             {isCurrent && isPlaying ? (
                               <div className="flex gap-[2px] justify-center items-end h-3">
                                 <span className="w-0.5 bg-emerald-500 animate-pulse h-2"></span>
                                 <span className="w-0.5 bg-emerald-500 animate-pulse h-3 animation-delay-75"></span>
                                 <span className="w-0.5 bg-emerald-500 animate-pulse h-1 animation-delay-150"></span>
                               </div>
                             ) : (
                               i + 1
                             )}
                          </div>
                          <img src={track.cover} className="w-10 h-10 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isCurrent ? 'text-emerald-500' : 'text-white'}`}>{track.title}</div>
                            <div className="text-xs text-gray-500">{track.artist}</div>
                          </div>
                          <div className="text-xs text-gray-500">{track.album}</div>
                          <div className="text-xs text-gray-500 w-12 text-right">{formatTime(track.duration)}</div>
                          <button 
                            className={`p-2 hover:bg-white/10 rounded-full ${liked[track.id] ? 'text-emerald-500' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleLike(track.id)
                            }}
                          >
                             <Heart size={16} fill={liked[track.id] ? "currentColor" : "none"} />
                          </button>
                          {activeTab.startsWith('playlist-') && (
                              <button 
                                className="p-2 hover:bg-white/10 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeFromPlaylist(activeTab, track.id)
                                }}
                                title="Remove from Playlist"
                              >
                                 <Trash2 size={16} />
                              </button>
                          )}
                        </div>
                      )
                    })}
                    {(activeTab.startsWith('playlist-') 
                        ? (playlists.find(p => p.id === activeTab)?.tracks.length === 0)
                        : (playlist.filter(t => {
                            if (activeTab === 'likes' && !liked[t.id]) return false
                            if (activeTab === 'local' && !t.isLocal) return false
                            if (activeTab === 'hall' && (t.isLocal || t.isOnline)) return false
                            return true
                          }).length === 0)
                    ) && activeTab !== 'local' && (
                        <div className="text-gray-500 text-center py-20">No tracks found</div>
                    )}
                  </div>
               </div>
            )}

            {activeTab === 'eq' && (
              <div className="flex flex-col h-full">
                <h1 className="text-2xl font-bold mb-6">{t('music.eq')}</h1>
                <div className="flex-1 bg-[#2a2a2a]/50 rounded-xl border border-white/5 p-8 flex items-center justify-center">
                   <Equalizer frequencies={EQ_FREQUENCIES} gains={eqGains} onChange={handleEqChange} />
                </div>
              </div>
            )}

            {(activeTab === 'video' || activeTab === 'radio' || activeTab === 'recent') && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MonitorSpeaker size={48} className="mb-4 opacity-50" />
                    <p>This feature is coming soon...</p>
                </div>
            )}

          </div>
        </div>
      </div>

      {/* Player Bar */}
      <div className="h-20 bg-[#222] border-t border-[#333] flex items-center justify-between px-4 shrink-0 z-30 relative">
          
          {/* Track Info */}
          <div className="flex items-center gap-3 w-[30%]">
              <div 
                className="w-12 h-12 rounded-md bg-gray-800 overflow-hidden relative group cursor-pointer"
                onClick={() => setShowDetail(true)}
              >
                  <img 
                    src={currentTrack.cover} 
                    className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}
                    alt="Cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ChevronUp size={24} className="text-white" />
                  </div>
              </div>
              <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium truncate cursor-pointer hover:underline" onClick={() => setShowDetail(true)}>
                        {currentTrack.title}
                      </span>
                      <span className="text-[10px] border border-emerald-500 text-emerald-500 px-0.5 rounded ml-1">HQ</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate cursor-pointer hover:underline">{currentTrack.artist}</div>
              </div>
              <button 
                className={`ml-2 transition-colors ${liked[currentTrack.id] ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}
                onClick={() => toggleLike(currentTrack.id)}
              >
                <Heart size={16} fill={liked[currentTrack.id] ? "currentColor" : "none"} />
              </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center w-[40%]">
              <div className="flex items-center gap-6 mb-1">
                  <button 
                    className={`hover:text-white transition-colors ${isShuffled ? 'text-emerald-500' : 'text-gray-400'}`} 
                    onClick={toggleShuffle}
                  >
                    <Shuffle size={16} />
                  </button>
                  <button className="text-gray-300 hover:text-white" onClick={playPrev}><SkipBack size={20} fill="currentColor" /></button>
                  <button 
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform text-black"
                    onClick={togglePlay}
                  >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button className="text-gray-300 hover:text-white" onClick={() => playNext()}><SkipForward size={20} fill="currentColor" /></button>
                  <button 
                    className={`hover:text-white transition-colors relative ${repeatMode !== 'off' ? 'text-emerald-500' : 'text-gray-400'}`} 
                    onClick={toggleRepeat}
                  >
                    <Repeat size={16} />
                    {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                  </button>
              </div>
              <div className="flex items-center gap-2 w-full max-w-md">
                  <span className="text-[10px] text-gray-500 w-8 text-right">{formatTime(currentTime)}</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={isNaN(progress) ? 0 : progress}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                  />
                  <span className="text-[10px] text-gray-500 w-8">{formatTime(duration || currentTrack.duration)}</span>
              </div>
          </div>

          {/* Volume & More */}
          <div className="flex items-center justify-end gap-3 w-[30%]">
              <ListMusic size={18} className="text-gray-400 hover:text-white cursor-pointer" />
              <div className="flex items-center gap-2 group w-24">
                  <Volume2 size={18} className="text-gray-400" />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
              </div>
              <button 
                className="text-gray-400 hover:text-white ml-2"
                onClick={() => setShowDetail(true)}
              >
                <Maximize2 size={16} />
              </button>
          </div>
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {showDetail && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-40 bg-[#1e1e1e]/95 backdrop-blur-3xl flex flex-col pt-10"
          >
            {/* Overlay Background */}
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none blur-[100px]"
              style={{ background: `radial-gradient(circle at center, ${currentTrackIndex % 2 === 0 ? '#10b981' : '#3b82f6'} 0%, transparent 70%)` }}
            />

            {/* Overlay Header */}
            <div className="h-16 flex items-center justify-between px-8 shrink-0 z-10">
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white">
                <ChevronDown size={28} />
              </button>
              <div className="text-xs text-gray-400 uppercase tracking-widest">Now Playing</div>
              <button className="text-gray-400 hover:text-white">
                <MoreHorizontal size={24} />
              </button>
            </div>

            {/* Overlay Content */}
            <div className="flex-1 flex items-center justify-center gap-12 px-12 z-10">
              
              {/* Left: Album Art & Visualizer */}
              <div className="w-[400px] h-[400px] shrink-0 relative flex items-center justify-center">
                 {/* Visualizer Background */}
                 <div className="absolute inset-0 scale-150 opacity-30">
                    <Visualizer analyser={analyser} isPlaying={isPlaying} />
                 </div>

                 <div className={`w-full h-full rounded-full bg-black shadow-2xl flex items-center justify-center border-8 border-[#1a1a1a] z-10 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                    <div className="w-[70%] h-[70%] rounded-full overflow-hidden relative">
                       <img src={currentTrack.cover} className="w-full h-full object-cover" />
                    </div>
                 </div>
              </div>

              {/* Right: Lyrics / Info */}
              <div className="w-[400px] flex flex-col items-start text-left shrink-0">
                 <h2 className="text-4xl font-bold text-white mb-2">{currentTrack.title}</h2>
                 <p className="text-xl text-emerald-400 mb-8">{currentTrack.artist} — {currentTrack.album}</p>
                 
                 <div className="w-full h-[300px] overflow-hidden mask-image-linear-fade relative">
                    <div className="text-2xl font-medium text-white/90 leading-relaxed space-y-6">
                        <p className="text-white">Music is the language of the soul</p>
                        <p className="text-gray-300">Drifting through the digital waves</p>
                        <p className="text-gray-300">Code and rhythm intertwine</p>
                        <p className="text-gray-300">Creating worlds within the mind</p>
                        <p className="text-gray-400 blur-[1px]">Echoes of a distant time</p>
                        <p className="text-gray-500 blur-[2px]">Fading into the sublime</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Overlay Footer Controls (Mirrored state) */}
            <div className="h-24 px-20 flex flex-col justify-center z-10 pb-8">
               <div className="flex items-center gap-4 w-full mb-4">
                  <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{formatTime(duration || currentTrack.duration)}</span>
               </div>
               
               <div className="flex items-center justify-center gap-10">
                   <button 
                     className={`hover:text-white transition-colors ${isShuffled ? 'text-emerald-500' : 'text-gray-400'}`} 
                     onClick={toggleShuffle}
                   >
                     <Shuffle size={20} />
                   </button>
                   <button className="text-white hover:scale-110 transition-transform" onClick={playPrev}><SkipBack size={28} fill="currentColor" /></button>
                   <button 
                      className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center hover:scale-105 transition-transform text-black shadow-lg shadow-emerald-500/20"
                      onClick={togglePlay}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                   <button className="text-white hover:scale-110 transition-transform" onClick={() => playNext()}><SkipForward size={28} fill="currentColor" /></button>
                   <button 
                     className={`hover:text-white transition-colors relative ${repeatMode !== 'off' ? 'text-emerald-500' : 'text-gray-400'}`} 
                     onClick={toggleRepeat}
                   >
                     <Repeat size={20} />
                     {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>}
                   </button>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] bg-[#2a2a2a] border border-[#333] rounded-md shadow-xl py-1 w-48 overflow-hidden"
          >
             <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white flex items-center gap-2"
                onClick={(e) => {
                    e.stopPropagation()
                    playTrack(contextMenu.track)
                    setContextMenu(null)
                }}
             >
                <Play size={14} /> Play
             </button>
             
             {playlists.length > 0 && (
                <>
                    <div className="h-[1px] bg-[#333] my-1" />
                    <div className="px-4 py-1 text-xs text-gray-500 font-medium">Add to Playlist</div>
                    {playlists.map(pl => (
                        <button 
                            key={pl.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white flex items-center gap-2 pl-6"
                            onClick={(e) => {
                                e.stopPropagation()
                                addToPlaylist(pl.id, contextMenu.track)
                            }}
                        >
                            <ListMusic size={12} /> {pl.name}
                        </button>
                    ))}
                </>
             )}
             
             <div className="h-[1px] bg-[#333] my-1" />
             <button 
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333] hover:text-red-300 flex items-center gap-2"
                onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTrack(contextMenu.track.id)
                }}
             >
                <Trash2 size={14} /> Delete
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
