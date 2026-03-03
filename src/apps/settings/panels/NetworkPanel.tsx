import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Globe, ShieldAlert, RefreshCw, Lock } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'
import { DEFAULT_CSP_CONFIG, CSP_COOKIE_NAME } from '@/os/config/csp'

export const NetworkPanel = () => {
    const { t, language } = useLanguage()
    const [domains, setDomains] = useState<string[]>([])
    const [newDomain, setNewDomain] = useState('')
    const [hasChanges, setHasChanges] = useState(false)

    // Extract default allowed domains (filtering out 'self', 'blob:', etc.)
    const defaultDomains = DEFAULT_CSP_CONFIG['frame-src'].filter(d => d.startsWith('http'))

    // Load domains from cookie on mount
    useEffect(() => {
        const cookies = document.cookie.split(';')
        const cspCookie = cookies.find(c => c.trim().startsWith(`${CSP_COOKIE_NAME}=`))
        if (cspCookie) {
            const domainString = cspCookie.split('=')[1]
            if (domainString) {
                // Decode URI component in case of special characters, though domains shouldn't have them
                try {
                    setDomains(decodeURIComponent(domainString).split(',').filter(Boolean))
                } catch (e) {
                    console.error('Failed to parse CSP cookie', e)
                }
            }
        }
    }, [])

    const saveDomains = (newDomains: string[]) => {
        setDomains(newDomains)
        // Save to cookie with long expiration
        const domainString = newDomains.join(',')
        document.cookie = `${CSP_COOKIE_NAME}=${encodeURIComponent(domainString)}; path=/; max-age=31536000; samesite=strict`
        setHasChanges(true)
    }

    const handleAdd = () => {
        if (!newDomain) return
        
        let domain = newDomain.trim()
        
        // Basic validation/cleanup
        if (domain.startsWith('https://')) domain = domain.replace('https://', '')
        if (domain.startsWith('http://')) domain = domain.replace('http://', '')
        if (domain.endsWith('/')) domain = domain.slice(0, -1)

        if (!domains.includes(domain)) {
            // Prepend https:// if no protocol specified, unless it's a wildcard
            if (!domain.startsWith('http') && !domain.startsWith('*')) {
                domain = `https://${domain}`
            }
            
            saveDomains([...domains, domain])
        }
        setNewDomain('')
    }

    const handleRemove = (domain: string) => {
        saveDomains(domains.filter(d => d !== domain))
    }

    const handleReload = () => {
        window.location.reload()
    }

    return (
        <div className="space-y-6">
            {/* Warning Box */}
            <div 
                className="rounded-xl p-4 flex items-start gap-3 border"
                style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Yellow-500/10
                    borderColor: 'rgba(234, 179, 8, 0.2)',     // Yellow-500/20
                }}
            >
                <ShieldAlert className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <h3 className="text-sm font-medium text-yellow-500 mb-1">{t('settings.network.whitelist')}</h3>
                    <p className="text-xs leading-relaxed opacity-80" style={{ color: 'var(--os-text-secondary)' }}>
                        {t('settings.network.whitelist.desc')}
                    </p>
                </div>
            </div>

            <SettingSection title={t('settings.network.whitelist')}>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder={t('settings.network.placeholder')}
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        style={{
                            backgroundColor: 'var(--os-bg-base)',
                            border: '1px solid var(--os-border)',
                            color: 'var(--os-text-primary)'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newDomain}
                        className="text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: 'var(--os-accent)',
                        }}
                    >
                        <Plus size={16} />
                        {t('settings.network.add')}
                    </button>
                </div>

                <div className="space-y-2">
                    {/* System Default Domains */}
                    {defaultDomains.map((domain) => (
                        <div 
                            key={`default-${domain}`}
                            className="flex items-center justify-between px-3 py-2 rounded-lg group transition-colors opacity-70 hover:opacity-100"
                            style={{
                                backgroundColor: 'var(--os-bg-base)',
                                border: '1px dashed var(--os-border)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <Globe size={16} style={{ color: 'var(--os-text-muted)' }} />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium" style={{ color: 'var(--os-text-primary)' }}>{domain}</span>
                                    <span className="text-[10px] uppercase tracking-wider opacity-60" style={{ color: 'var(--os-text-muted)' }}>
                                        {language === 'zh' ? '系统默认' : 'System Default'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-2" title={language === 'zh' ? '系统默认配置，无法删除' : 'System default configuration, cannot be removed'}>
                                <Lock size={14} className="opacity-40" />
                            </div>
                        </div>
                    ))}

                    {/* User Custom Domains */}
                    {domains.map((domain) => (
                        <div 
                            key={domain} 
                            className="flex items-center justify-between px-3 py-2 rounded-lg group transition-colors"
                            style={{
                                backgroundColor: 'var(--os-bg-base)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <Globe size={16} style={{ color: 'var(--os-text-muted)' }} />
                                <span className="text-sm" style={{ color: 'var(--os-text-primary)' }}>{domain}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(domain)}
                                className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:text-red-400"
                                style={{ color: 'var(--os-text-muted)' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {domains.length === 0 && defaultDomains.length === 0 && (
                        <div className="text-center py-8 text-sm" style={{ color: 'var(--os-text-muted)' }}>
                            {t('settings.network.empty')}
                        </div>
                    )}
                </div>
            </SettingSection>

            {hasChanges && (
                <div className="fixed bottom-8 right-8 animate-in fade-in slide-in-from-bottom-4">
                    <div 
                        className="px-4 py-3 rounded-xl shadow-lg flex items-center gap-4 text-white"
                        style={{ backgroundColor: 'var(--os-accent)' }}
                    >
                        <div className="text-sm">
                            <div className="font-medium">{t('settings.network.apply')}</div>
                            <div className="text-xs opacity-80">{t('settings.network.apply.desc')}</div>
                        </div>
                        <button 
                            onClick={handleReload}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={14} />
                            {t('settings.network.reload')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
