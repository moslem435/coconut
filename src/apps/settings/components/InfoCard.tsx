export function InfoCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext?: string }) {
    return (
        <div className="p-4 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg-panel)]/50 flex flex-col gap-2 transition-all hover:bg-[var(--os-hover-bg)] hover:scale-[1.02]">
            <div className="flex items-center gap-2 mb-1">
                <div className="text-[var(--os-accent)]">{icon}</div>
                <span className="text-xs font-medium text-[var(--os-text-muted)] uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-lg font-bold text-[var(--os-text-primary)] truncate" title={value}>{value}</div>
            {subtext && <div className="text-xs text-[var(--os-text-secondary)]">{subtext}</div>}
        </div>
    )
}
