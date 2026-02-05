'use client'

import { motion } from 'framer-motion'
import { Monitor, Smartphone, PenTool, Code, CheckSquare, ArrowUpRight } from 'lucide-react'
import { soundManager } from '@/lib/sound'

const SERVICES = [
  {
    id: "WEB_DEV",
    icon: Monitor,
    title: "WEB_DEVELOPMENT",
    desc: "Full-stack web applications built with React, Next.js, and Node. Performance optimized and SEO ready.",
    price: "STARTING_AT_5000_CREDITS"
  },
  {
    id: "APP_DEV",
    icon: Smartphone,
    title: "MOBILE_APPS",
    desc: "Cross-platform mobile experiences using React Native. Native performance with a single codebase.",
    price: "STARTING_AT_4000_CREDITS"
  },
  {
    id: "UI_DESIGN",
    icon: PenTool,
    title: "UI/UX_DESIGN",
    desc: "High-fidelity interface design, prototyping, and user experience research. Cyberpunk aesthetics available.",
    price: "STARTING_AT_3000_CREDITS"
  },
  {
    id: "CONSULT",
    icon: Code,
    title: "TECH_CONSULTATION",
    desc: "System architecture review, code audits, and technical strategy planning for startups and enterprises.",
    price: "HOURLY_RATE_APPLIES"
  }
]

export default function ServicesBoard() {
  return (
    <div className="h-full w-full flex flex-col gap-6 p-4 font-mono text-white/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 border border-white/20 rounded-sm">
             <CheckSquare size={20} className="text-white" />
          </div>
          <div>
            <div className="text-xs tracking-widest text-white/40">CONTRACTS_BOARD</div>
            <div className="text-lg font-bold tracking-wider">AVAILABLE_MISSIONS</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] tracking-widest text-green-500">OPEN_FOR_WORK</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
         <div className="grid grid-cols-1 gap-4">
            {SERVICES.map((service, i) => (
               <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                  className="relative p-4 border border-white/10 bg-white/5 group cursor-pointer overflow-hidden"
                  onClick={() => soundManager.playClick()}
               >
                  {/* Hover Accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-white/0 group-hover:bg-white transition-colors duration-300" />
                  
                  <div className="flex items-start justify-between mb-3">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-black/40 rounded-sm text-cyan-400 group-hover:text-white transition-colors">
                           <service.icon size={20} />
                        </div>
                        <h3 className="font-bold tracking-wide group-hover:text-cyan-400 transition-colors">{service.title}</h3>
                     </div>
                     <ArrowUpRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                  </div>
                  
                  <p className="text-xs text-white/60 leading-relaxed mb-4 pl-[52px]">
                     {service.desc}
                  </p>

                  <div className="pl-[52px] flex items-center justify-between border-t border-white/5 pt-3">
                     <span className="text-[10px] text-white/30 font-mono">{service.id}</span>
                     <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-sm">
                        {service.price}
                     </span>
                  </div>
               </motion.div>
            ))}
         </div>
      </div>
    </div>
  )
}
