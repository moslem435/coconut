import { Settings, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingCategory } from '../types'

interface SettingSidebarProps {
    categories: SettingCategory[]
    activeCategory: string
    onCategoryChange: (id: string) => void
}

export function SettingSidebar({ categories, activeCategory, onCategoryChange }: SettingSidebarProps) {
    const { t } = useLanguage()

    return (
        <div className="w-64 border-r border-[var(--os-border)]/50 p-4 pt-14 space-y-1 overflow-y-auto shrink-0 bg-[var(--os-hover-bg)]/30 backdrop-blur-md">
            <div className="flex items-center gap-3 px-3 py-4 mb-4">
                <Settings size={24} className="text-[var(--os-accent)]" />
                <span className="text-lg font-semibold">{t('start.settings')}</span>
            </div>

            {categories.map((cat) => {
                const Icon = cat.icon
                const isActive = activeCategory === cat.id
                return (
                    <button
                        key={cat.id}
                        onClick={() => onCategoryChange(cat.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${isActive ? '' : 'hover:bg-[var(--os-hover-bg)] hover:translate-x-1'
                            }`}
                        style={{
                            backgroundColor: isActive ? 'var(--os-accent-dim)' : undefined,
                            color: isActive ? 'var(--os-accent)' : 'var(--os-text-secondary)'
                        }}
                    >
                        <Icon size={18} className="group-hover:text-[var(--os-text-primary)]" />
                        <span className="text-sm group-hover:text-[var(--os-text-primary)]">{cat.label}</span>
                        {isActive && (
                            <ChevronRight size={14} className="ml-auto" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
