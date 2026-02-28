import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Check, Copy, ExternalLink, MapPin, Briefcase } from 'lucide-react'
import { APP_CONFIG } from '@/appConfig'

export function AboutMeTab() {
    const [emailCopied, setEmailCopied] = useState(false)

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('contact@coconut.os')
        setEmailCopied(true)
        setTimeout(() => setEmailCopied(false), 2000)
    }

    // Skill categories for better organization
    const skills = [
        { name: 'React', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { name: 'TypeScript', color: 'text-blue-600', bg: 'bg-blue-700/10', border: 'border-blue-700/20' },
        { name: 'Tailwind CSS', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
        { name: 'Node.js', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { name: 'Framer Motion', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { name: 'Vite', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { name: 'Next.js', color: 'text-white', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    ]

    return (
        <motion.div
            key="me"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
        >
            {/* Author Card */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl bg-[var(--os-bg-base)] border border-[var(--os-border)] group hover:border-[var(--os-accent)]/40 transition-all shadow-sm hover:shadow-md"
            >
                {/* Background Banner */}
                <div className="h-24 bg-gradient-to-r from-[var(--os-accent)]/20 to-[var(--os-accent-dim)]/20 absolute top-0 left-0 right-0" />
                
                <div className="relative pt-12 px-6 pb-6 flex flex-col items-center text-center">
                    {/* Avatar */}
                    <a 
                        href={APP_CONFIG.author.giteeUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="relative z-10 mb-3"
                    >
                        <div className="relative group/avatar">
                            <img
                                src={APP_CONFIG.author.avatarUrl}
                                alt={APP_CONFIG.author.name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-[var(--os-bg-base)] shadow-xl transition-transform duration-300 group-hover/avatar:scale-105"
                                onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement
                                    target.style.display = 'none'
                                    const next = target.nextElementSibling as HTMLElement | null
                                    if (next) next.style.display = 'flex'
                                }}
                            />
                            {/* Fallback Avatar */}
                            <div
                                className="w-24 h-24 rounded-full bg-[var(--os-accent)]/20 border-4 border-[var(--os-bg-base)] text-[var(--os-accent)] text-3xl font-bold items-center justify-center hidden shadow-xl"
                            >
                                {APP_CONFIG.author.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Online Status */}
                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-[var(--os-bg-base)] rounded-full z-20" />
                        </div>
                    </a>

                    {/* Info */}
                    <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--os-text-primary)' }}>
                        {APP_CONFIG.author.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-4 text-xs font-medium text-[var(--os-text-secondary)]">
                        <span className="flex items-center gap-1">
                            <Briefcase size={12} />
                            {APP_CONFIG.author.title}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            Earth
                        </span>
                    </div>

                    <p className="text-sm leading-relaxed max-w-md mx-auto mb-6 px-4 py-2 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)]/50 italic" style={{ color: 'var(--os-text-secondary)' }}>
                        "{APP_CONFIG.author.bio}"
                    </p>

                    {/* Social Actions */}
                    <div className="flex items-center gap-3 w-full justify-center">
                        <a
                            href={APP_CONFIG.author.giteeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--os-accent)] text-white text-sm font-medium hover:bg-[var(--os-accent-hover)] transition-colors shadow-lg shadow-[var(--os-accent)]/20"
                        >
                            <span>Follow on Gitee</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </motion.div>
            
            {/* Skills & Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Skills */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="p-5 rounded-2xl bg-[var(--os-bg-base)]/60 border border-[var(--os-border)] flex flex-col gap-4"
                >
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--os-text-primary)' }}>
                        <span className="w-1 h-4 rounded-full bg-[var(--os-accent)]" />
                        Skills & Tech
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                            <span 
                                key={skill.name} 
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-default ${skill.bg} ${skill.border} ${skill.color}`}
                            >
                                {skill.name}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Contact */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="p-5 rounded-2xl bg-[var(--os-bg-base)]/60 border border-[var(--os-border)] flex flex-col gap-4"
                >
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--os-text-primary)' }}>
                        <span className="w-1 h-4 rounded-full bg-[var(--os-accent)]" />
                        Get in Touch
                    </h3>
                    
                    <div 
                        onClick={handleCopyEmail}
                        className="group cursor-pointer flex items-center gap-3 p-3 rounded-xl bg-[var(--os-bg-base)] border border-[var(--os-border)] hover:border-[var(--os-accent)]/30 hover:bg-[var(--os-hover-bg)] transition-all"
                    >
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                            <Mail size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[var(--os-text-secondary)] mb-0.5">Email</div>
                            <div className="text-sm font-medium text-[var(--os-text-primary)] truncate">contact@coconut.os</div>
                        </div>
                        <div className="text-[var(--os-text-secondary)] opacity-50 group-hover:opacity-100 transition-opacity">
                            {emailCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
