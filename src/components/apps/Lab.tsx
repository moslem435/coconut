'use client'

import { motion } from 'framer-motion'
import { Beaker, Microscope, Zap } from 'lucide-react'
import { soundManager } from '@/lib/sound'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/lib/LanguageContext'

export default function LabGrid() {
  const { language } = useLanguage()
  const { LAB_ITEMS } = DATA[language]

  return (
    <div className="h-full w-full flex flex-col gap-4 p-2 font-mono text-white/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 min-h-[40px]">
        <div className="flex items-center gap-2 text-xs tracking-widest text-pink-500">
          <Beaker size={14} />
          <span>RESEARCH_LAB // EXPERIMENTAL</span>
        </div>
        <div className="flex gap-2">
           <div className="w-2 h-2 bg-pink-500 animate-pulse" />
           <div className="w-2 h-2 bg-white/20" />
           <div className="w-2 h-2 bg-white/20" />
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="grid grid-cols-2 gap-3 p-1">
          {LAB_ITEMS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="aspect-square relative group border border-white/10 bg-white/5 overflow-hidden cursor-pointer"
              onMouseEnter={() => soundManager.playHover()}
              onClick={() => soundManager.playClick()}
            >
              {/* Background Noise/Grid Effect */}
              <div 
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{
                  backgroundImage: `radial-gradient(${item.color} 1px, transparent 1px)`,
                  backgroundSize: '10px 10px'
                }}
              />
              
              {/* Content */}
              <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] text-white/40 border border-white/10 px-1">{item.id}</span>
                  <Zap size={12} style={{ color: item.color }} className="opacity-50 group-hover:opacity-100" />
                </div>
                
                <div className="relative z-10">
                  <div className="text-[10px] text-white/50 mb-1">{item.type}</div>
                  <h3 className="text-xs font-bold leading-tight group-hover:text-white transition-colors" style={{ textShadow: `0 0 10px ${item.color}40` }}>
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Hover Overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ backgroundColor: item.color }}
              />
              
              {/* Corner Accents */}
              <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-white/20 group-hover:border-white/60 transition-colors" />
            </motion.div>
          ))}
          
          {/* Placeholder for "Coming Soon" */}
          <div className="aspect-square flex flex-col items-center justify-center border border-white/5 bg-black/20 text-white/20">
            <Microscope size={24} className="mb-2 opacity-50" />
            <span className="text-[9px] tracking-widest">ANALYZING...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
