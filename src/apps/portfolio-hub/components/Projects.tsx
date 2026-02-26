'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Terminal, Layers, Code, Cpu, ExternalLink } from 'lucide-react'
import { soundManager } from '@/lib/sound'
import { DATA } from '@/lib/data'
import { useSystem } from '@/os/sdk'

interface ProjectsProps {
  activeProject?: number
  onProjectChange?: (index: number) => void
  selectedSubProject?: string | null
  onSubProjectChange?: (id: string) => void
  onSelect?: (id: string) => void
}

export default function Projects({
  activeProject,
  onProjectChange,
  selectedSubProject,
  onSubProjectChange,
  onSelect
}: ProjectsProps) {
  const { language } = useSystem()
  const { WORK_ITEMS } = DATA[language]

  const [internalSelectedId, setInternalSelectedId] = useState(WORK_ITEMS[0]?.id || '')
  const selectedId = selectedSubProject || internalSelectedId
  const fallbackWork = { id: '', title: 'Loading...', type: '', year: '', desc: '', stack: [], color: '' }
  const selectedWork = WORK_ITEMS.find(w => w.id === selectedId) || WORK_ITEMS[0] || fallbackWork

  const handleSelect = (id: string) => {
    setInternalSelectedId(id)
    onSubProjectChange?.(id)
    onSelect?.(id)
    soundManager.playClick()
  }

  return (
    <div className="h-full w-full flex flex-col gap-4 p-2 font-mono text-white/90">

      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 min-h-[40px]">
        <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-400">
          <Terminal size={14} />
          <span>PROJECT_DECK // SELECTED_WORKS</span>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <div className="w-2 h-2 bg-white/20" />
          <div className="w-2 h-2 bg-white/20" />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">

        {/* LEFT: List View */}
        <div className="w-full h-1/3 md:w-1/3 md:h-auto flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
          {WORK_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              onMouseEnter={() => soundManager.playHover()}
              className={`
                group relative p-3 text-left border transition-all duration-300
                ${selectedId === item.id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
              `}
            >
              {/* Active Indicator */}
              {selectedId === item.id && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 shadow-[inset_0_0_15px_rgba(6,182,212,0.2)]"
                />
              )}

              <div className="relative z-10 flex flex-col gap-1">
                <span className={`text-[10px] tracking-widest ${selectedId === item.id ? 'text-cyan-300' : 'text-white/40'}`}>
                  {item.id}
                </span>
                <span className={`font-bold truncate ${selectedId === item.id ? 'text-white' : 'text-white/70'}`}>
                  {item.title}
                </span>
              </div>

              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] transition-all
                ${selectedId === item.id ? 'border-t-cyan-500 border-r-transparent' : 'border-t-transparent border-r-transparent'}
              `} />
            </button>
          ))}
        </div>

        {/* RIGHT: Detail View */}
        <div className="flex-1 border border-white/10 bg-black/20 relative overflow-hidden flex flex-col">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedWork.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 h-full flex flex-col"
            >
              {/* Image/Preview Placeholder */}
              <div className={`h-[45%] w-full bg-gradient-to-br ${selectedWork.color} opacity-20 relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers size={64} className="text-white opacity-20" />
                </div>
                {/* Scanline */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-[50%] animate-[scan_3s_linear_infinite]" />
              </div>

              {/* Info Area */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tighter mb-1">{selectedWork.title}</h3>
                      <span className="text-xs text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                        {selectedWork.type}
                      </span>
                    </div>
                    <span className="text-white/30 font-mono text-sm">{selectedWork.year}</span>
                  </div>

                  <p className="text-sm text-white/70 leading-relaxed mb-6 border-l-2 border-white/10 pl-4">
                    {selectedWork.desc}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest">
                      <Cpu size={12} />
                      <span>Tech Stack</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedWork.stack.map(tech => (
                        <span key={tech} className="text-xs border border-white/10 bg-white/5 px-2 py-1 text-white/60">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    className="group flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm tracking-wider hover:bg-cyan-400 transition-colors"
                    onMouseEnter={() => soundManager.playHover()}
                    onClick={() => soundManager.playClick()}
                  >
                    <span>INITIATE_PROTOCOL</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
