import { motion } from 'framer-motion'

interface WindowSnapPreviewProps {
    show: boolean
}

export function WindowSnapPreview({ show }: WindowSnapPreviewProps) {
    if (!show) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] pointer-events-none"
            style={{
                background: 'linear-gradient(to bottom, var(--os-accent-dim) 0%, transparent 30%)',
                borderTop: '2px solid var(--os-accent)'
            }}
        />
    )
}
