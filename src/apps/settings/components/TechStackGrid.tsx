import { techStack } from '../constants'

export function TechStackGrid() {
    return (
        <div className="grid grid-cols-3 gap-3">
            {techStack.map((item) => (
                <div key={item.name} className="flex flex-col items-center justify-center p-3 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg-base)] hover:bg-[var(--os-hover-bg)] transition-colors gap-2 group cursor-default">
                    <div style={{ color: item.color }} className="group-hover:scale-110 transition-transform">
                        {item.icon}
                    </div>
                    <span className="text-xs text-[var(--os-text-secondary)] text-center">{item.name}</span>
                </div>
            ))}
        </div>
    )
}
