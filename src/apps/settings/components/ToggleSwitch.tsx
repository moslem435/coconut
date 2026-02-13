import { motion } from 'framer-motion'

export function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center justify-between cursor-pointer group py-3 select-none">
            <span className="text-sm font-medium transition-colors duration-200 group-hover:text-[var(--os-text-primary)] text-[var(--os-text-secondary)]">
                {label}
            </span>

            <div
                className="relative isolate"
                onClick={(e) => {
                    e.preventDefault()
                    onChange(!checked)
                }}
            >
                {/* Track */}
                <motion.div
                    className="w-[46px] h-[28px] rounded-full transition-colors duration-300"
                    style={{
                        backgroundColor: checked ? 'var(--os-accent)' : 'var(--os-border-active)',
                        boxShadow: checked
                            ? '0 0 12px var(--os-accent-dim)'
                            : 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}
                />

                {/* Knob */}
                <motion.div
                    initial={false}
                    animate={{
                        x: checked ? 20 : 2
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                    className="absolute top-[2px] left-0 w-[24px] h-[24px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] z-10"
                />
            </div>
        </label>
    )
}
