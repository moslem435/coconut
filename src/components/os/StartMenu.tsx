import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Power, Settings } from 'lucide-react'

export default function StartMenu({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-12 left-2 w-64 bg-black/90 border border-cyan-500/30 rounded-lg p-2 shadow-[0_0_30px_rgba(8,145,178,0.2)] backdrop-blur-xl z-[250]"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex items-center gap-3 p-3 border-b border-cyan-900/30 mb-2">
                <div className="w-10 h-10 rounded bg-cyan-900/20 flex items-center justify-center border border-cyan-500/20">
                   <Terminal size={20} className="text-cyan-400" />
                </div>
                <div>
                   <div className="text-xs font-bold text-cyan-300">USER_ADMIN</div>
                   <div className="text-[10px] text-cyan-700">LEVEL 9 ACCESS</div>
                </div>
             </div>
             
             <div className="space-y-1">
                <MenuItem icon={Power} label="SHUTDOWN" />
                <MenuItem icon={Settings} label="SETTINGS" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
  )
}

function MenuItem({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-cyan-900/20 cursor-pointer transition-colors group">
       <Icon size={16} className="text-cyan-700 group-hover:text-cyan-400" />
       <span className="text-xs text-cyan-600 group-hover:text-cyan-300 tracking-wider">{label}</span>
    </div>
  )
}