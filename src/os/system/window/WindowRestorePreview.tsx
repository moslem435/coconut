import { motion } from 'framer-motion'

interface WindowRestorePreviewProps {
    preview: { x: number; y: number; width: number; height: number } | null
}

export function WindowRestorePreview({ preview }: WindowRestorePreviewProps) {
    if (!preview) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[6000] pointer-events-none rounded-xl"
            style={{
                left: preview.x,
                top: preview.y,
                width: preview.width,
                height: preview.height,
                backgroundColor: 'var(--os-accent-glow)',
                border: '2px dashed var(--os-accent)',
                boxShadow: '0 0 30px var(--os-accent-dim)'
            }}
        />
    )
}
