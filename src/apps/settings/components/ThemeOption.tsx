export function ThemeOption({
    icon: Icon,
    label,
    active,
    onClick
}: {
    icon: React.ComponentType<any>
    label: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${active ? 'border-[var(--os-accent)]' : 'border-transparent hover:border-[var(--os-border)]'}`}
            style={{
                backgroundColor: active ? 'var(--os-accent-dim)' : 'var(--os-hover-bg)',
                color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)'
            }}
        >
            <Icon size={24} color={active ? 'var(--os-accent)' : 'var(--os-text-secondary)'} />
            <span className={`text-sm`} style={{ color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)' }}>{label}</span>
        </button>
    )
}
