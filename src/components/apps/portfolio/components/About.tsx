'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Cpu, 
  Terminal, 
  Wifi, 
  Github, 
  Twitter, 
  Mail, 
  Activity,
  Database,
  Shield,
  Zap
} from 'lucide-react'
import { soundManager } from '@/lib/sound'
import { DATA, SOCIAL_LINKS } from '@/lib/data'
import { useLanguage } from '@/lib/LanguageContext'

const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block group">
    <span className="relative z-10">{text}</span>
    <span className="absolute top-0 left-0 -ml-[2px] text-red-500 opacity-0 group-hover:opacity-70 animate-pulse">{text}</span>
    <span className="absolute top-0 left-0 ml-[2px] text-cyan-500 opacity-0 group-hover:opacity-70 animate-pulse delay-75">{text}</span>
  </div>
)

const Panel = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "backOut" }}
    className={`relative border border-white/10 bg-white/5 backdrop-blur-sm p-4 overflow-hidden group ${className}`}
    onMouseEnter={() => soundManager.playHover()}
  >
    {/* Corner Accents */}
    <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/40" />
    <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/40" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/40" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/40" />
    
    {/* Scanline Effect */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] w-full -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out pointer-events-none" />
    
    {children}
  </motion.div>
)

const SkillBar = ({ label, level, color = "bg-cyan-500" }: { label: string, level: number, color?: string }) => (
  <div className="mb-2">
    <div className="flex justify-between text-[10px] font-mono mb-1 opacity-70">
      <span>{label}</span>
      <span>{level}%</span>
    </div>
    <div className="h-1 w-full bg-white/10">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${level}%` }}
        transition={{ duration: 1, delay: 0.5 }}
        className={`h-full ${color} shadow-[0_0_10px_currentColor]`}
      />
    </div>
  </div>
)

export default function About() {
  const { language } = useLanguage()
  const { SKILLS, EXPERIENCE, ARSENAL, SERVICES, PROJECTS } = DATA[language]
  const aboutDescription = PROJECTS.find(p => p.id === '02')?.description

  const [leftTab, setLeftTab] = useState<'SKILLS' | 'ARSENAL'>('SKILLS')
  const [rightTab, setRightTab] = useState<'LOG' | 'SERVICES'>('LOG')

  return (
    <div className="h-full w-full flex flex-col gap-4 font-mono text-white/90 p-2">
      {/* HEADER: IDENTITY */}
      <Panel className="flex items-center gap-6 min-h-[120px]" delay={0.1}>
        <div className="relative w-20 h-20 border border-white/20 flex items-center justify-center bg-black/50">
           <User size={40} className="text-cyan-400 opacity-80" />
           {/* Glitch Overlay */}
           <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start border-b border-white/10 pb-2 mb-2">
             <div className="flex flex-col">
               <span className="text-[10px] text-white/40 tracking-widest">OPERATIVE_ID</span>
               <span className="text-xl font-bold tracking-wider text-cyan-400"><GlitchText text="USER_001" /></span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                <span className="text-[10px] text-green-500">ONLINE</span>
             </div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            {aboutDescription}
          </p>
        </div>
      </Panel>

      {/* MIDDLE: SKILLS & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        
        {/* LEFT COLUMN: SKILLS / ARSENAL */}
        <Panel className="flex flex-col relative min-h-0" delay={0.2}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4 shrink-0">
             <div className="flex items-center gap-2">
                {leftTab === 'SKILLS' ? <Cpu size={14} className="text-cyan-400" /> : <Database size={14} className="text-pink-500" />}
                <span className={`text-xs font-bold tracking-widest ${leftTab === 'SKILLS' ? 'text-cyan-400' : 'text-pink-500'}`}>
                  {leftTab === 'SKILLS' ? 'AUGMENTATIONS' : 'ARSENAL'}
                </span>
             </div>
             {/* Tab Switcher */}
             <div className="flex gap-2">
                <button 
                  onClick={() => { setLeftTab('SKILLS'); soundManager.playClick() }}
                  className={`text-[9px] px-2 py-0.5 border transition-colors ${leftTab === 'SKILLS' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-white/10 text-white/30 hover:text-white/60'}`}
                >
                  SKILLS
                </button>
                <button 
                  onClick={() => { setLeftTab('ARSENAL'); soundManager.playClick() }}
                  className={`text-[9px] px-2 py-0.5 border transition-colors ${leftTab === 'ARSENAL' ? 'border-pink-500 text-pink-400 bg-pink-500/10' : 'border-white/10 text-white/30 hover:text-white/60'}`}
                >
                  ARSENAL
                </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 relative">
             <AnimatePresence mode="wait">
                {leftTab === 'SKILLS' ? (
                  <motion.div 
                    key="skills"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {SKILLS.map((skill) => (
                      <SkillBar key={skill.label} label={skill.label} level={skill.level} color={skill.color} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="arsenal"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {ARSENAL.map((tool) => (
                      <div key={tool.name} className="flex items-center gap-2 border border-white/5 bg-white/5 p-2 rounded-sm group/tool hover:bg-white/10 transition-colors">
                        <div className="w-1 h-1 bg-pink-500/50 group-hover/tool:bg-pink-400" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white/90">{tool.name}</span>
                          <span className="text-[8px] text-white/40">{tool.category}</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </Panel>

        {/* RIGHT COLUMN: LOG / SERVICES */}
        <Panel className="flex flex-col relative min-h-0" delay={0.3}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4 shrink-0">
             <div className="flex items-center gap-2">
                {rightTab === 'LOG' ? <Activity size={14} className="text-yellow-400" /> : <Zap size={14} className="text-green-400" />}
                <span className={`text-xs font-bold tracking-widest ${rightTab === 'LOG' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {rightTab === 'LOG' ? 'MISSION_LOG' : 'SERVICES'}
                </span>
             </div>
             {/* Tab Switcher */}
             <div className="flex gap-2">
                <button 
                  onClick={() => { setRightTab('LOG'); soundManager.playClick() }}
                  className={`text-[9px] px-2 py-0.5 border transition-colors ${rightTab === 'LOG' ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-white/10 text-white/30 hover:text-white/60'}`}
                >
                  LOG
                </button>
                <button 
                  onClick={() => { setRightTab('SERVICES'); soundManager.playClick() }}
                  className={`text-[9px] px-2 py-0.5 border transition-colors ${rightTab === 'SERVICES' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-white/10 text-white/30 hover:text-white/60'}`}
                >
                  SERVICES
                </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 relative">
             <AnimatePresence mode="wait">
                {rightTab === 'LOG' ? (
                  <motion.div 
                    key="log"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-xs"
                  >
                    {EXPERIENCE.map((log, i) => (
                      <div key={i} className="flex gap-3 group/log cursor-default">
                        <span className="text-white/30 font-mono">{log.year}</span>
                        <div className="flex-1 border-l border-white/10 pl-3 relative">
                          <div className="absolute left-[-1px] top-1 w-[2px] h-2 bg-yellow-500/50 group-hover/log:bg-yellow-400 transition-colors" />
                          <div className="text-white/80 group-hover/log:text-white transition-colors">{log.event}</div>
                          <div className="text-[9px] text-green-500/60 mt-0.5">[{log.status}]</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="services"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1"
                  >
                    {SERVICES.map((service, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                        <span className="text-green-500/50">::</span>
                        <span className="text-[11px] text-white/80">{service}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </Panel>
      </div>

      {/* FOOTER: UPLINK */}
      <Panel className="h-auto" delay={0.4}>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Wifi size={14} className="text-white/40 animate-pulse" />
             <span className="text-[10px] tracking-widest text-white/40">SECURE_UPLINK</span>
           </div>
           
           <div className="flex gap-4">
             {SOCIAL_LINKS.map((Link, i) => (
               <motion.button
                 key={i}
                 whileHover={{ scale: 1.1, color: "#fff" }}
                 whileTap={{ scale: 0.95 }}
                 className="p-2 border border-white/10 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/50 text-white/60 transition-colors rounded-sm group relative"
                 onClick={() => {
                    soundManager.playClick()
                    window.open(Link.href, '_blank')
                 }}
               >
                 <Link.icon size={18} />
                 {/* Tooltip removed */}
               </motion.button>
             ))}
           </div>
        </div>
      </Panel>
    </div>
  )
}
