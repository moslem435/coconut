'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Lock, Globe, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react'
import { soundManager } from '@/lib/sound'

export default function ContactTerminal() {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    soundManager.playClick()
    setStatus('SENDING')
    setTimeout(() => {
       setStatus('SENT')
       soundManager.playHover() // Success sound placeholder
    }, 2000)
  }

  return (
    <div className="h-full w-full flex flex-col gap-6 p-4 font-mono text-white/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-500/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-sm">
             <Lock size={20} className="text-green-500" />
          </div>
          <div>
            <div className="text-xs tracking-widest text-green-500">SECURE_CHANNEL</div>
            <div className="text-lg font-bold tracking-wider">ENCRYPTED_UPLINK</div>
          </div>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-green-500/60">LATENCY: 12ms</div>
           <div className="text-[10px] text-green-500/60">ENCRYPTION: AES-256</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
         {/* Status Message */}
         <div className="p-4 bg-green-900/10 border-l-2 border-green-500 text-sm text-green-400/80 leading-relaxed">
            <span className="text-green-500 font-bold mr-2">SYS_MSG:</span>
            Channel is open for business inquiries, collaboration proposals, and confidential transmissions. All data is end-to-end encrypted.
         </div>

         {/* Form */}
         <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1">
               <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Identity_String</label>
               <div className="relative group">
                  <input 
                    type="text" 
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    placeholder="ENTER_NAME"
                    className="w-full bg-black/40 border border-white/10 p-3 text-sm focus:border-green-500 focus:outline-none transition-colors placeholder:text-white/20"
                    disabled={status !== 'IDLE'}
                  />
                  <div className="absolute inset-0 border border-green-500/0 group-hover:border-green-500/20 pointer-events-none transition-colors" />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Return_Address</label>
               <div className="relative group">
                  <input 
                    type="email" 
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    placeholder="ENTER_EMAIL_PROTOCOL"
                    className="w-full bg-black/40 border border-white/10 p-3 text-sm focus:border-green-500 focus:outline-none transition-colors placeholder:text-white/20"
                    disabled={status !== 'IDLE'}
                  />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Data_Packet</label>
               <div className="relative group">
                  <textarea 
                    rows={6}
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                    placeholder="INPUT_MESSAGE_CONTENT..."
                    className="w-full bg-black/40 border border-white/10 p-3 text-sm focus:border-green-500 focus:outline-none transition-colors placeholder:text-white/20 resize-none"
                    disabled={status !== 'IDLE'}
                  />
               </div>
            </div>

            {/* Submit Button */}
            <motion.button
               whileHover={{ scale: 1.01 }}
               whileTap={{ scale: 0.99 }}
               type="submit"
               disabled={status !== 'IDLE'}
               className={`
                  relative overflow-hidden p-4 mt-2 font-bold tracking-widest text-sm uppercase transition-all
                  ${status === 'SENT' 
                     ? 'bg-green-500 text-black border-green-500' 
                     : 'bg-green-500/10 border border-green-500/50 text-green-500 hover:bg-green-500/20'
                  }
               `}
            >
               {status === 'IDLE' && (
                  <div className="flex items-center justify-center gap-2">
                     <span>Initialize_Transmission</span>
                     <Send size={16} />
                  </div>
               )}
               
               {status === 'SENDING' && (
                  <div className="flex items-center justify-center gap-2">
                     <span className="animate-pulse">ENCRYPTING_PACKET...</span>
                  </div>
               )}

               {status === 'SENT' && (
                  <div className="flex items-center justify-center gap-2">
                     <span>TRANSMISSION_COMPLETE</span>
                     <AlertCircle size={16} />
                  </div>
               )}
            </motion.button>
         </form>

         {/* Alternative Contacts */}
         <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/10 pt-6">
            <a href="mailto:hello@example.com" className="flex items-center gap-3 p-3 border border-white/5 hover:bg-white/5 hover:border-green-500/30 transition-all group">
               <Mail size={18} className="text-white/40 group-hover:text-green-400 transition-colors" />
               <div className="text-xs">
                  <div className="text-white/40">DIRECT_MAIL</div>
                  <div className="text-white/80">hello@example.com</div>
               </div>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 border border-white/5 hover:bg-white/5 hover:border-green-500/30 transition-all group">
               <Globe size={18} className="text-white/40 group-hover:text-green-400 transition-colors" />
               <div className="text-xs">
                  <div className="text-white/40">GLOBAL_NETWORK</div>
                  <div className="text-white/80">@social_handle</div>
               </div>
            </a>
         </div>
      </div>
    </div>
  )
}

function Mail({ size, className }: { size: number, className?: string }) {
   return (
      <svg 
         xmlns="http://www.w3.org/2000/svg" 
         width={size} 
         height={size} 
         viewBox="0 0 24 24" 
         fill="none" 
         stroke="currentColor" 
         strokeWidth="2" 
         strokeLinecap="round" 
         strokeLinejoin="round" 
         className={className}
      >
         <rect width="20" height="16" x="2" y="4" rx="2" />
         <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
   )
}
