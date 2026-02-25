import { useRef, useState, useEffect } from 'react'
import { Database, Download, Upload, RotateCcw, ChevronRight, HardDrive, MessageSquare, Settings2, Music, Layout, Check, Trash2 } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { SettingSection } from '../components/SettingSection'
import { storage as aiChatStorage } from '@/apps/ai-chat/utils/storage'

interface BackupStats {
    key: string;
    label: { en: string; zh: string };
    icon: any;
    size: number;
    count?: number;
    iconClass: string;
    checked: boolean;
}

export function DataPanel() {
    const { t, language } = useLanguage()
    const { openAlert, openConfirm } = useDialogStore()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [stats, setStats] = useState<BackupStats[]>([])
    const [totalSize, setTotalSize] = useState(0)

    useEffect(() => {
        const loadStats = async () => {
            const newStats: BackupStats[] = []
            
            // 1. System Settings
            const settings = localStorage.getItem('cloud-os-settings') || ''
            const settingsSize = new Blob([settings]).size
            newStats.push({
                key: 'settings',
                label: { en: 'System Settings', zh: '系统设置' },
                icon: Settings2,
                size: settingsSize,
                iconClass: 'bg-blue-500/10 text-blue-500',
                checked: true
            })
            
            // 2. AI Chat
            try {
                const sessions = await aiChatStorage.getSessions()
                const chatSize = new Blob([JSON.stringify(sessions)]).size
                newStats.push({
                    key: 'aiChat',
                    label: { en: 'AI Chat History', zh: 'AI 聊天记录' },
                    icon: MessageSquare,
                    size: chatSize,
                    count: sessions.length,
                    iconClass: 'bg-purple-500/10 text-purple-500',
                    checked: true
                })
            } catch (e) {
                console.error('Failed to load AI chat stats', e)
            }

            // 3. Filesystem
            const fs = localStorage.getItem('filesystem-storage') || ''
            const fsSize = new Blob([fs]).size
            newStats.push({
                key: 'filesystem',
                label: { en: 'My Files', zh: '我的文件' },
                icon: HardDrive,
                size: fsSize,
                iconClass: 'bg-orange-500/10 text-orange-500',
                checked: true
            })
            
            // 4. Desktop Layout
            const desktop = localStorage.getItem('desktop-storage') || ''
            const desktopSize = new Blob([desktop]).size
            newStats.push({
                key: 'desktop',
                label: { en: 'Desktop Layout', zh: '桌面布局' },
                icon: Layout,
                size: desktopSize,
                iconClass: 'bg-green-500/10 text-green-500',
                checked: true
            })
            
            // 5. Music Player
            const music = localStorage.getItem('music-player-state') || ''
            const musicSize = new Blob([music]).size
            newStats.push({
                key: 'music',
                label: { en: 'Music Player', zh: '音乐播放器' },
                icon: Music,
                size: musicSize,
                iconClass: 'bg-pink-500/10 text-pink-500',
                checked: true
            })
            
            setStats(newStats)
        }
        loadStats()
    }, [])

    useEffect(() => {
        const total = stats
            .filter(s => s.checked)
            .reduce((acc, curr) => acc + curr.size, 0)
        setTotalSize(total)
    }, [stats])

    const handleToggle = (key: string) => {
        setStats(prev => prev.map(s => 
            s.key === key ? { ...s, checked: !s.checked } : s
        ))
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 导出配置
    const handleExport = async () => {
        const backupData: any = {
            version: '2.0',
            timestamp: Date.now(),
            system: {},
            apps: {},
            filesystem: undefined
        }

        const selectedKeys = new Set(stats.filter(s => s.checked).map(s => s.key))

        if (selectedKeys.has('settings')) {
            backupData.system.settings = JSON.parse(localStorage.getItem('cloud-os-settings') || '{}')
            backupData.system.language = JSON.parse(localStorage.getItem('portfolio_lang') || '{}')
        }

        if (selectedKeys.has('desktop')) {
            backupData.system.desktop = JSON.parse(localStorage.getItem('desktop-storage') || '{}')
        }

        if (selectedKeys.has('music')) {
            backupData.apps.music = JSON.parse(localStorage.getItem('music-player-state') || '{}')
        }

        if (selectedKeys.has('aiChat')) {
            backupData.apps.aiChat = await aiChatStorage.getSessions()
        }

        if (selectedKeys.has('filesystem')) {
            backupData.filesystem = JSON.parse(localStorage.getItem('filesystem-storage') || '{}')
        }

        const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `portfolio-os-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
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
                
                // 验证备份格式
                if (parsed.version === '2.0') {
                    // 新版全量恢复
                    if (parsed.system?.settings) localStorage.setItem('cloud-os-settings', JSON.stringify(parsed.system.settings))
                    if (parsed.system?.language) localStorage.setItem('portfolio_lang', JSON.stringify(parsed.system.language))
                    if (parsed.system?.desktop) localStorage.setItem('desktop-storage', JSON.stringify(parsed.system.desktop))
                    
                    if (parsed.filesystem) localStorage.setItem('filesystem-storage', JSON.stringify(parsed.filesystem))
                    
                    if (parsed.apps?.music) localStorage.setItem('music-player-state', JSON.stringify(parsed.apps.music))
                    if (parsed.apps?.aiChat) await aiChatStorage.saveSessions(parsed.apps.aiChat)
                    
                    window.location.reload()
                } else if (parsed.state && parsed.version !== undefined) {
                    // 旧版仅设置恢复
                    localStorage.setItem('cloud-os-settings', content)
                    window.location.reload()
                } else {
                    await openAlert('Invalid Backup', 'Unknown backup format')
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

    // 清理选中数据
    const handleClearSelected = () => {
        const selectedKeys = stats.filter(s => s.checked).map(s => s.key)
        if (selectedKeys.length === 0) return

        const confirmTitle = language === 'zh' ? '清理选中数据' : 'Clear Selected Data'
        const confirmDesc = language === 'zh' 
            ? `确定要永久删除这 ${selectedKeys.length} 项数据吗？此操作无法撤销。` 
            : `Are you sure you want to permanently delete these ${selectedKeys.length} items? This cannot be undone.`

        useDialogStore.getState().openActionSheet(
            confirmTitle,
            confirmDesc,
            [
                {
                    label: language === 'zh' ? '确认清理' : 'Confirm Clear',
                    isDestructive: true,
                    onClick: async () => {
                        try {
                            // 1. System Settings
                            if (selectedKeys.includes('settings')) {
                                // @ts-ignore
                                if (useSystemSettingsStore.persist) {
                                    // @ts-ignore
                                    useSystemSettingsStore.persist.clearStorage()
                                } else {
                                    localStorage.removeItem('cloud-os-settings')
                                }
                                localStorage.removeItem('portfolio_lang')
                            }

                            // 2. AI Chat
                            if (selectedKeys.includes('aiChat')) {
                                await aiChatStorage.clearSessions()
                            }

                            // 3. Filesystem
                            if (selectedKeys.includes('filesystem')) {
                                localStorage.removeItem('filesystem-storage')
                            }

                            // 4. Desktop
                            if (selectedKeys.includes('desktop')) {
                                localStorage.removeItem('desktop-storage')
                            }

                            // 5. Music
                            if (selectedKeys.includes('music')) {
                                localStorage.removeItem('music-player-state')
                            }

                            window.location.reload()
                        } catch (error) {
                            console.error('Clear failed', error)
                            await openAlert('Error', 'Failed to clear data')
                        }
                    }
                }
            ]
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Backup Overview */}
            <div className="bg-[var(--os-bg-base)]/40 border border-[var(--os-border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-[var(--os-text-primary)]">
                    {language === 'zh' ? '备份内容概览' : 'Backup Overview'}
                    <span className="ml-2 text-sm font-normal text-[var(--os-text-secondary)]">
                        (Total: {formatSize(totalSize)})
                    </span>
                </h3>
                <div className="space-y-3">
                    {stats.map((stat) => (
                        <div 
                            key={stat.key} 
                            onClick={() => handleToggle(stat.key)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                stat.checked 
                                    ? 'bg-[var(--os-bg-base)]/60 border-[var(--os-border)]/50' 
                                    : 'bg-[var(--os-bg-base)]/20 border-transparent opacity-60 hover:opacity-80'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center min-w-5 h-5 rounded border transition-colors ${
                                    stat.checked 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'border-[var(--os-border)] bg-[var(--os-bg-base)]'
                                }`}>
                                    {stat.checked && <Check size={14} />}
                                </div>
                                <div className={`p-2 rounded-lg ${stat.iconClass}`}>
                                    <stat.icon size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-[var(--os-text-primary)]">
                                        {language === 'zh' ? stat.label.zh : stat.label.en}
                                    </div>
                                    <div className="text-xs text-[var(--os-text-secondary)]">
                                        {stat.key === 'aiChat' && stat.count !== undefined 
                                            ? `${stat.count} ${language === 'zh' ? '个会话' : 'sessions'}`
                                            : stat.key === 'filesystem' 
                                                ? (language === 'zh' ? '包含所有虚拟文件' : 'Includes all virtual files')
                                                : (language === 'zh' ? '本地配置' : 'Local configuration')
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm font-mono text-[var(--os-text-secondary)]">
                                {formatSize(stat.size)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
            <div className="pt-4 border-t border-[var(--os-border)]/50 space-y-3">
                <button 
                    onClick={handleClearSelected}
                    disabled={stats.filter(s => s.checked).length === 0}
                    className="w-full group relative overflow-hidden p-5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all duration-300 text-left flex items-center gap-5 hover:shadow-md hover:shadow-red-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="p-3 rounded-full bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform duration-500">
                        <Trash2 size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-500 mb-0.5">
                            {language === 'zh' ? '清理选中数据' : 'Clear Selected Data'}
                        </h3>
                        <p className="text-xs text-[var(--os-text-secondary)] group-hover:text-red-500/70 transition-colors">
                            {language === 'zh' 
                                ? `永久删除选中的 ${stats.filter(s => s.checked).length} 项数据` 
                                : `Permanently delete ${stats.filter(s => s.checked).length} selected items`
                            }
                        </p>
                    </div>
                    <ChevronRight size={18} className="text-red-500/40 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                </button>

                <button 
                    onClick={handleReset}
                    className="w-full group relative overflow-hidden p-4 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg-base)]/40 hover:bg-[var(--os-bg-base)]/60 transition-all duration-300 text-left flex items-center gap-4 opacity-70 hover:opacity-100"
                >
                    <div className="p-2 rounded-full bg-[var(--os-text-primary)]/5 text-[var(--os-text-primary)] group-hover:rotate-180 transition-transform duration-500">
                        <RotateCcw size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-[var(--os-text-primary)] mb-0.5 text-sm">
                            {t('settings.data.reset')}
                        </h3>
                    </div>
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
