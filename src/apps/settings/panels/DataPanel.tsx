import { useRef } from 'react'
import { Database, Download, Upload, RotateCcw, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { SettingSection } from '../components/SettingSection'

export function DataPanel() {
    const { t } = useLanguage()
    const { openAlert, openConfirm } = useDialogStore()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 导出配置
    const handleExport = () => {
        const settings = localStorage.getItem('cloud-os-settings')
        if (settings) {
            const blob = new Blob([settings], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `portfolio-os-backup-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    // 导入配置
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string
                const parsed = JSON.parse(content)
                // 简单的验证
                if (parsed && parsed.state && parsed.version !== undefined) {
                    localStorage.setItem('cloud-os-settings', content)
                    window.location.reload() // 刷新以应用更改
                } else {
                    await openAlert('Invalid Backup', 'Invalid backup file format')
                }
            } catch (err) {
                console.error('Import failed', err)
                await openAlert('Import Failed', 'Failed to parse backup file')
            }
        }
        reader.readAsText(file)
    }

    // 重置配置
    const handleReset = () => {
        useDialogStore.getState().openActionSheet(
            t('settings.data.reset'),
            t('settings.data.reset.desc'),
            [
                {
                    label: t('settings.data.reset'),
                    isDestructive: true,
                    onClick: () => {
                        // @ts-ignore
                        if (useSystemSettingsStore.persist) {
                            // @ts-ignore
                            useSystemSettingsStore.persist.clearStorage()
                        } else {
                            localStorage.removeItem('cloud-os-settings')
                        }
                        window.location.reload()
                    }
                }
            ]
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 导出卡片 */}
                <button 
                    onClick={handleExport}
                    className="group relative overflow-hidden p-6 rounded-2xl border border-[var(--os-border)] bg-[var(--os-bg-base)]/40 hover:bg-[var(--os-bg-base)]/60 transition-all duration-300 text-left hover:shadow-lg hover:border-blue-500/30 hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--os-text-primary)] mb-1 group-hover:text-blue-500 transition-colors">
                                {t('settings.data.export')}
                            </h3>
                            <p className="text-sm text-[var(--os-text-secondary)] leading-relaxed">
                                {t('settings.data.export.desc')}
                            </p>
                        </div>
                    </div>
                </button>

                {/* 导入卡片 */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative overflow-hidden p-6 rounded-2xl border border-[var(--os-border)] bg-[var(--os-bg-base)]/40 hover:bg-[var(--os-bg-base)]/60 transition-all duration-300 text-left hover:shadow-lg hover:border-green-500/30 hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 p-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/10 transition-colors" />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="p-3 w-fit rounded-xl bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--os-text-primary)] mb-1 group-hover:text-green-500 transition-colors">
                                {t('settings.data.import')}
                            </h3>
                            <p className="text-sm text-[var(--os-text-secondary)] leading-relaxed">
                                {t('settings.data.import.desc')}
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* 危险区域 - 重置 */}
            <div className="pt-4 border-t border-[var(--os-border)]/50">
                <button 
                    onClick={handleReset}
                    className="w-full group relative overflow-hidden p-5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all duration-300 text-left flex items-center gap-5 hover:shadow-md hover:shadow-red-500/5"
                >
                    <div className="p-3 rounded-full bg-red-500/10 text-red-500 group-hover:rotate-180 transition-transform duration-500">
                        <RotateCcw size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-500 mb-0.5">
                            {t('settings.data.reset')}
                        </h3>
                        <p className="text-xs text-[var(--os-text-secondary)] group-hover:text-red-500/70 transition-colors">
                            {t('settings.data.reset.desc')}
                        </p>
                    </div>
                    <ChevronRight size={18} className="text-red-500/40 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                </button>
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleImport} 
            />
        </div>
    )
}
