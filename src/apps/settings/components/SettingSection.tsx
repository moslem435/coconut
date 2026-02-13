export function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider pl-1">{title}</h3>
            <div className="bg-[var(--os-bg-panel)] rounded-xl p-6 border border-[var(--os-border)] shadow-sm">
                {children}
            </div>
        </div>
    )
}
