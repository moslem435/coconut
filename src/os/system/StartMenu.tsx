import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Power, Settings } from 'lucide-react'

export default function StartMenu({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 w-80 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl z-[250]"
                    style={{
                        backgroundColor: 'var(--os-bg-window)',
                        borderColor: 'var(--os-border)',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-4 p-2 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                            style={{
                                backgroundColor: 'var(--os-bg-base)',
                                border: '1px solid var(--os-border)'
                            }}>
                            <Terminal size={24} style={{ color: 'var(--os-accent)' }} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--os-text-primary)' }}>Visitor</div>
                            <div className="text-xs" style={{ color: 'var(--os-text-secondary)' }}>Cloud OS User</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <MenuItem icon={Settings} label="Settings" />
                        <div className="h-px w-full my-2 bg-gradient-to-r from-transparent via-[var(--os-border)] to-transparent" />
                        <MenuItem icon={Power} label="Shut Down" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function MenuItem({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center gap-3 p-2 rounded cursor-pointer transition-colors group relative overflow-hidden">
            <Icon size={16} className="relative z-10 transition-colors" style={{ color: 'var(--os-text-secondary)' }} />
            <span className="text-xs tracking-wider relative z-10 transition-colors" style={{ color: 'var(--os-text-primary)' }}>{label}</span>

            <style jsx>{`
         div:hover {
           background-color: var(--os-hover-bg);
         }
         div:hover svg {
           color: var(--os-accent) !important;
         }
       `}</style>
        </div>
    )
}