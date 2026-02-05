'use client'

import { motion } from 'framer-motion'
import { FileText, Download, Shield, Award, Briefcase, Calendar } from 'lucide-react'
import { soundManager } from '@/lib/sound'

const HISTORY = [
  { 
    role: "SENIOR_ENGINEER", 
    org: "CYBER_CORP_LTD", 
    period: "2022 - PRESENT",
    desc: "Lead architect for distributed neural networks and core system infrastructure. Optimized rendering pipelines by 400%."
  },
  { 
    role: "INTERFACE_DESIGNER", 
    org: "NEON_STUDIOS", 
    period: "2020 - 2022",
    desc: "Designed immersive holographic interfaces for consumer-grade terminals. Awarded 'Best UX' in Sector 7."
  },
  { 
    role: "FREELANCE_MERC", 
    org: "GLOBAL_NET", 
    period: "2018 - 2020",
    desc: "Executed high-value contracts for various clients. Specializing in rapid prototyping and crisis management."
  }
]

const CERTS = ["AWS_CERTIFIED_ARCHITECT", "KUBERNETES_ADMIN", "OFFENSIVE_SECURITY", "REACT_ADVANCED_PATTERNS"]

export default function ResumeDossier() {
  return (
    <div className="h-full w-full flex flex-col gap-6 p-4 font-mono text-white/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-500/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-sm">
             <FileText size={20} className="text-purple-500" />
          </div>
          <div>
            <div className="text-xs tracking-widest text-purple-500">PERSONNEL_FILE</div>
            <div className="text-lg font-bold tracking-wider">CLASSIFIED_RECORDS</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Shield size={14} className="text-purple-500" />
           <span className="text-[10px] tracking-widest text-purple-500">CLEARANCE_LEVEL_5</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
         
         {/* Summary Section */}
         <section className="relative p-4 border border-white/10 bg-white/5">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <h3 className="text-xs text-white/40 mb-2 uppercase tracking-widest">Executive_Summary</h3>
            <p className="text-sm leading-relaxed text-white/80">
               Highly decorated operative with extensive experience in full-stack development and interface design. 
               Proven track record of delivering mission-critical systems under high pressure. 
               Specialized in next-gen web technologies and immersive user experiences.
            </p>
         </section>

         {/* Experience Timeline */}
         <section>
            <h3 className="flex items-center gap-2 text-xs text-purple-400 mb-4 uppercase tracking-widest border-b border-white/10 pb-2">
               <Briefcase size={14} />
               Mission_History
            </h3>
            <div className="space-y-4 pl-2 border-l border-white/10 ml-1">
               {HISTORY.map((job, i) => (
                  <div key={i} className="relative pl-6 pb-2 group">
                     {/* Timeline Dot */}
                     <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-black border border-purple-500 group-hover:bg-purple-500 transition-colors" />
                     
                     <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">{job.role}</h4>
                        <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded-full">{job.period}</span>
                     </div>
                     <div className="text-xs text-purple-400/80 mb-2">{job.org}</div>
                     <p className="text-xs text-white/60 leading-relaxed max-w-[90%]">
                        {job.desc}
                     </p>
                  </div>
               ))}
            </div>
         </section>

         {/* Certifications */}
         <section>
            <h3 className="flex items-center gap-2 text-xs text-purple-400 mb-4 uppercase tracking-widest border-b border-white/10 pb-2">
               <Award size={14} />
               Certifications_&_Badges
            </h3>
            <div className="grid grid-cols-2 gap-2">
               {CERTS.map((cert, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border border-white/5 bg-white/[0.02] text-xs text-white/70 hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors cursor-default">
                     <div className="w-1 h-1 bg-purple-500" />
                     {cert}
                  </div>
               ))}
            </div>
         </section>

      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-white/10">
         <button 
            onClick={() => soundManager.playClick()}
            className="w-full flex items-center justify-center gap-2 p-3 bg-purple-500 hover:bg-purple-400 text-black font-bold tracking-widest transition-colors"
         >
            <Download size={16} />
            <span>DOWNLOAD_FULL_DOSSIER.PDF</span>
         </button>
      </div>
    </div>
  )
}
