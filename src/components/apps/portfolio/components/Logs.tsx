'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Tag, Calendar, ChevronRight } from 'lucide-react'
import { soundManager } from '@/lib/sound'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/lib/LanguageContext'

export default function LogArchive() {
  const { language } = useLanguage()
  const { LOGS } = DATA[language]
  
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  
  const selectedLog = selectedLogId ? LOGS.find(l => l.id === selectedLogId) : null

  return (
    <div className="h-full w-full flex flex-col gap-4 p-2 font-mono text-white/90">
      {/* Header */}
       <div className="flex items-center justify-between border-b border-white/10 pb-2 min-h-[40px]">
        <div className="flex items-center gap-2 text-xs tracking-widest text-yellow-400">
          <FileText size={14} />
          <span>LOG_ARCHIVE // THOUGHT_STREAM</span>
        </div>
        <div className="flex gap-2">
           <div className="w-2 h-2 bg-yellow-500 animate-pulse" />
           <div className="w-2 h-2 bg-white/20" />
           <div className="w-2 h-2 bg-white/20" />
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* List View */}
        <div className={`${selectedLog ? 'w-1/3 hidden md:flex' : 'w-full'} flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 transition-all duration-300`}>
           {LOGS.map((log) => (
             <button
               key={log.id}
               onClick={() => {
                 setSelectedLogId(log.id)
                 soundManager.playClick()
               }}
               onMouseEnter={() => soundManager.playHover()}
               className={`
                 group relative p-4 text-left border transition-all duration-300
                 ${selectedLogId === log.id 
                   ? 'border-yellow-500 bg-yellow-500/10' 
                   : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
               `}
             >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-white/40">{log.date}</span>
                  <span className="text-[10px] text-white/30 border border-white/10 px-1 rounded">{log.id}</span>
                </div>
                <h3 className={`font-bold text-sm mb-2 ${selectedLogId === log.id ? 'text-yellow-400' : 'text-white'}`}>
                  {log.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {log.tags.map(tag => (
                    <span key={tag} className="text-[10px] text-white/50">#{tag}</span>
                  ))}
                </div>
             </button>
           ))}
        </div>

        {/* Detail View */}
        <AnimatePresence mode="wait">
          {selectedLog && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 border border-white/10 bg-white/5 p-6 overflow-y-auto custom-scrollbar relative"
            >
               {/* Close button for mobile could go here */}
               <button 
                 onClick={() => setSelectedLogId(null)}
                 className="md:hidden absolute top-4 right-4 text-white/50 hover:text-white"
               >
                 CLOSE [X]
               </button>

               <div className="mb-6 border-b border-white/10 pb-4">
                 <div className="flex items-center gap-2 text-yellow-400 mb-2">
                   <Calendar size={14} />
                   <span className="text-xs">{selectedLog.date}</span>
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-4">{selectedLog.title}</h2>
                 <div className="flex gap-2">
                   {selectedLog.tags.map(tag => (
                     <div key={tag} className="flex items-center gap-1 text-xs text-white/50 border border-white/10 px-2 py-1">
                       <Tag size={10} />
                       {tag}
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="prose prose-invert prose-sm max-w-none">
                 <p className="leading-relaxed text-white/80">
                   {selectedLog.content}
                 </p>
                 <p className="leading-relaxed text-white/80 mt-4">
                   [... END_OF_TRANSMISSION ...]
                 </p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
