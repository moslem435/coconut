import { useState, useRef, useEffect, FormEvent, useMemo } from 'react'
import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Search,
    Home,
    Plus,
    X,
    Globe,
    Star,
    MoreVertical,
    Clock,
    Download,
    Settings,
    Bookmark,
    Trash2,
    FileText,
    HardDrive,
    ExternalLink,
    AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { FilePickerDialog } from '@/os/ui/dialogs/FilePickerDialog'

// --- Types ---

interface HistoryEntry {
    url: string
    title: string
    timestamp: number
}

interface BookmarkEntry {
    id: string
    url: string
    title: string
    createdAt: number
}

interface DownloadEntry {
    id: string
    fileName: string
    path: string
    url: string
    timestamp: number
    size: string
    status: 'completed' | 'failed'
}

interface BrowserSettings {
    homePage: string
    searchEngine: string
    showBookmarkBar: boolean
}

interface Tab {
    id: string
    title: string
    favicon?: string
    url: string            // The current URL in the address bar
    history: string[]      // History stack
    historyIndex: number   // Current position in history
    isLoading: boolean
    inputUrl: string       // What the user is typing
}

// --- Constants ---

const INTERNAL_PREFIX = 'browser://'
const PAGES = {
    NEWTAB: 'browser://newtab',
    HISTORY: 'browser://history',
    BOOKMARKS: 'browser://bookmarks',
    SETTINGS: 'browser://settings',
    DOWNLOADS: 'browser://downloads',
}

const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q='
const GOOGLE_HOME_URL = 'https://www.google.com/webhp?igu=1'

const generateId = () => Math.random().toString(36).substring(2, 9)

const isValidUrl = (string: string) => {
    try {
        new URL(string)
        return true
    } catch (_) {
        return false
    }
}

const formatUrl = (input: string): string => {
    const trimmed = input.trim()

    if (trimmed.startsWith(INTERNAL_PREFIX)) return trimmed

    // Check if it's a likely domain or localhost
    const domainRegex = /^(?:[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|localhost(?::\d+)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?)(?:\/[^\s]*)?$/

    if (isValidUrl(trimmed)) return trimmed
    if (isValidUrl(`https://${trimmed}`)) return `https://${trimmed}`

    if (domainRegex.test(trimmed)) {
        return `https://${trimmed}`
    }

    return `${GOOGLE_SEARCH_URL}${encodeURIComponent(trimmed)}`
}

const getDomain = (url: string) => {
    try {
        if (url.startsWith(INTERNAL_PREFIX)) return 'Browser'
        return new URL(url).hostname
    } catch {
        return url
    }
}

// --- Components ---

export default function Browser() {
    const { t } = useLanguage()
    const { createItem } = useFileSystemStore()

    // --- Persistent State ---
    const [globalHistory, setGlobalHistory] = useState<HistoryEntry[]>(() => {
        const saved = localStorage.getItem('os_browser_history')
        return saved ? JSON.parse(saved) : []
    })

    const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => {
        const saved = localStorage.getItem('os_browser_bookmarks')
        return saved ? JSON.parse(saved) : []
    })

    const [downloads, setDownloads] = useState<DownloadEntry[]>(() => {
        const saved = localStorage.getItem('os_browser_downloads')
        return saved ? JSON.parse(saved) : []
    })

    const [settings, setSettings] = useState<BrowserSettings>(() => {
        const saved = localStorage.getItem('os_browser_settings')
        return saved ? JSON.parse(saved) : {
            homePage: PAGES.NEWTAB,
            searchEngine: GOOGLE_SEARCH_URL,
            showBookmarkBar: false
        }
    })

    // --- Tab State ---
    const [tabs, setTabs] = useState<Tab[]>([{
        id: generateId(),
        title: t('browser.newtab'),
        url: settings.homePage,
        history: [settings.homePage],
        historyIndex: 0,
        isLoading: false,
        inputUrl: settings.homePage === PAGES.NEWTAB ? '' : settings.homePage
    }])
    const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id)
    const [showMenu, setShowMenu] = useState(false)

    // File Picker State
    const [pickerOpen, setPickerOpen] = useState(false)
    const [pendingDownload, setPendingDownload] = useState<{ url: string, name: string } | null>(null)

    const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({})
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

    // --- Effects ---

    useEffect(() => {
        localStorage.setItem('os_browser_history', JSON.stringify(globalHistory))
    }, [globalHistory])

    useEffect(() => {
        localStorage.setItem('os_browser_bookmarks', JSON.stringify(bookmarks))
    }, [bookmarks])

    useEffect(() => {
        localStorage.setItem('os_browser_downloads', JSON.stringify(downloads))
    }, [downloads])

    useEffect(() => {
        localStorage.setItem('os_browser_settings', JSON.stringify(settings))
    }, [settings])

    // --- Actions ---

    const updateTab = (id: string, updates: Partial<Tab>) => {
        setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, ...updates } : tab))
    }

    const addToHistory = (url: string, title: string) => {
        if (url.startsWith(INTERNAL_PREFIX)) return
        setGlobalHistory(prev => {
            const newEntry = { url, title, timestamp: Date.now() }
            // Filter out duplicates of the same URL to keep list clean, or just push top
            const filtered = prev.filter(h => h.url !== url)
            return [newEntry, ...filtered].slice(0, 100) // Keep last 100
        })
    }

    const handleNavigate = (e?: FormEvent, overrideUrl?: string) => {
        e?.preventDefault()
        const targetUrl = formatUrl(overrideUrl || activeTab.inputUrl)

        const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1)
        newHistory.push(targetUrl)

        updateTab(activeTabId, {
            url: targetUrl,
            inputUrl: targetUrl,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: !targetUrl.startsWith(INTERNAL_PREFIX),
            title: targetUrl
        })

        addToHistory(targetUrl, targetUrl)
    }

    const navigateTo = (url: string) => {
        handleNavigate(undefined, url)
        setShowMenu(false)
    }

    const handleNewTab = () => {
        const newTab: Tab = {
            id: generateId(),
            title: t('browser.newtab'),
            url: settings.homePage,
            history: [settings.homePage],
            historyIndex: 0,
            isLoading: false,
            inputUrl: ''
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
    }

    const handleCloseTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (tabs.length === 1) {
            updateTab(id, {
                url: settings.homePage,
                history: [settings.homePage],
                historyIndex: 0,
                isLoading: false,
                inputUrl: '',
                title: t('browser.newtab')
            })
            return
        }
        const newTabs = tabs.filter(t => t.id !== id)
        setTabs(newTabs)
        if (id === activeTabId) {
            setActiveTabId(newTabs[newTabs.length - 1].id)
        }
    }

    const handleGoBack = () => {
        if (activeTab.historyIndex > 0) {
            const newIndex = activeTab.historyIndex - 1
            const newUrl = activeTab.history[newIndex]
            updateTab(activeTabId, {
                historyIndex: newIndex,
                url: newUrl,
                inputUrl: newUrl,
                isLoading: !newUrl.startsWith(INTERNAL_PREFIX)
            })
        }
    }

    const handleGoForward = () => {
        if (activeTab.historyIndex < activeTab.history.length - 1) {
            const newIndex = activeTab.historyIndex + 1
            const newUrl = activeTab.history[newIndex]
            updateTab(activeTabId, {
                historyIndex: newIndex,
                url: newUrl,
                inputUrl: newUrl,
                isLoading: !newUrl.startsWith(INTERNAL_PREFIX)
            })
        }
    }

    const handleRefresh = () => {
        if (activeTab.url.startsWith(INTERNAL_PREFIX)) return
        const iframe = iframeRefs.current[activeTabId]
        if (iframe) {
            iframe.src = iframe.src
            updateTab(activeTabId, { isLoading: true })
        }
    }

    const handleHome = () => {
        navigateTo(settings.homePage)
    }

    const toggleBookmark = () => {
        const currentUrl = activeTab.url
        const exists = bookmarks.find(b => b.url === currentUrl)

        if (exists) {
            setBookmarks(prev => prev.filter(b => b.url !== currentUrl))
        } else {
            setBookmarks(prev => [...prev, {
                id: generateId(),
                url: currentUrl,
                title: activeTab.title,
                createdAt: Date.now()
            }])
        }
    }

    const handleDownloadRequest = () => {
        // Simulate download by asking where to save a dummy file
        const fileName = 'downloaded_page.html'
        setPendingDownload({ url: activeTab.url, name: fileName })
        setPickerOpen(true)
        setShowMenu(false)
    }

    const handleDownloadConfirm = (pathId: string, fileName?: string) => {
        if (!pendingDownload || !fileName) return

        // Create a dummy file
        createItem(pathId, fileName, 'file', `<html><body>Saved from ${pendingDownload.url}</body></html>`)

        // Add to downloads list
        setDownloads(prev => [{
            id: generateId(),
            fileName,
            path: pathId, // This is technically the parent folder ID, but fine for display
            url: pendingDownload.url,
            timestamp: Date.now(),
            size: '124 KB', // Dummy size
            status: 'completed'
        }, ...prev])

        setPendingDownload(null)
        setPickerOpen(false)
        navigateTo(PAGES.DOWNLOADS)
    }

    const handleIframeLoad = (id: string) => {
        updateTab(id, { isLoading: false })
        // Try to update title if possible (often blocked by CORS)
    }

    const isBookmarked = bookmarks.some(b => b.url === activeTab.url)

    // --- Internal Page Components ---

    const InternalPage = ({ url }: { url: string }) => {
        if (url === PAGES.NEWTAB) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
                    <div className="w-full max-w-2xl flex flex-col items-center gap-8">
                        <div className="text-4xl font-light text-gray-700 dark:text-gray-200 flex items-center gap-3">
                            <Globe size={48} className="text-blue-500" />
                            <span>Browser</span>
                        </div>

                        <form onSubmit={(e) => handleNavigate(e, activeTab.inputUrl)} className="w-full relative">
                            <input
                                className="w-full h-12 px-6 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm focus:shadow-md focus:border-blue-500 outline-none text-lg dark:bg-gray-800 dark:text-white transition-all"
                                placeholder={t('browser.search')}
                                value={activeTab.inputUrl === PAGES.NEWTAB ? '' : activeTab.inputUrl}
                                onChange={(e) => updateTab(activeTabId, { inputUrl: e.target.value })}
                                autoFocus
                            />
                            <Search className="absolute right-4 top-3.5 text-gray-400" />
                        </form>

                        <div className="grid grid-cols-4 gap-4 w-full mt-8">
                            {bookmarks.slice(0, 8).map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => navigateTo(b.url)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-500">
                                        {b.title.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full">{b.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }

        if (url === PAGES.HISTORY) {
            return (
                <div className="h-full bg-white dark:bg-gray-900 p-8 overflow-y-auto">
                    <h1 className="text-2xl font-medium mb-6 dark:text-white">History</h1>
                    <div className="max-w-3xl mx-auto flex flex-col gap-2">
                        {globalHistory.length === 0 ? (
                            <div className="text-gray-400 text-center py-10">No history yet</div>
                        ) : (
                            globalHistory.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group">
                                    <div className="text-xs text-gray-400 w-16">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigateTo(item.url)}>
                                        <div className="font-medium truncate dark:text-gray-200">{item.title}</div>
                                        <div className="text-xs text-gray-400 truncate">{item.url}</div>
                                    </div>
                                    <button
                                        onClick={() => setGlobalHistory(prev => prev.filter((_, idx) => idx !== i))}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )
        }

        if (url === PAGES.BOOKMARKS) {
            return (
                <div className="h-full bg-white dark:bg-gray-900 p-8 overflow-y-auto">
                    <h1 className="text-2xl font-medium mb-6 dark:text-white">Bookmarks</h1>
                    <div className="max-w-3xl mx-auto flex flex-col gap-2">
                        {bookmarks.length === 0 ? (
                            <div className="text-gray-400 text-center py-10">No bookmarks yet</div>
                        ) : (
                            bookmarks.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group">
                                    <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                                        <Star size={16} fill="currentColor" />
                                    </div>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigateTo(item.url)}>
                                        <div className="font-medium truncate dark:text-gray-200">{item.title}</div>
                                        <div className="text-xs text-gray-400 truncate">{item.url}</div>
                                    </div>
                                    <button
                                        onClick={() => setBookmarks(prev => prev.filter(b => b.id !== item.id))}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )
        }

        if (url === PAGES.DOWNLOADS) {
            return (
                <div className="h-full bg-white dark:bg-gray-900 p-8 overflow-y-auto">
                    <h1 className="text-2xl font-medium mb-6 dark:text-white">Downloads</h1>
                    <div className="max-w-3xl mx-auto flex flex-col gap-2">
                        {downloads.length === 0 ? (
                            <div className="text-gray-400 text-center py-10">No downloads yet</div>
                        ) : (
                            downloads.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                                    <div className="w-10 h-10 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate dark:text-gray-200">{item.fileName}</div>
                                        <div className="text-xs text-gray-400 truncate">{item.url}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span>{item.size}</span>
                                            <span>•</span>
                                            <span className="text-green-500 capitalize">{item.status}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )
        }

        if (url === PAGES.SETTINGS) {
            return (
                <div className="h-full bg-white dark:bg-gray-900 p-8 overflow-y-auto">
                    <h1 className="text-2xl font-medium mb-6 dark:text-white">Settings</h1>
                    <div className="max-w-2xl mx-auto flex flex-col gap-6">
                        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="font-medium mb-4 dark:text-gray-200">Appearance</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showBookmarkBar}
                                    onChange={e => setSettings(s => ({ ...s, showBookmarkBar: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <span className="dark:text-gray-300">Show bookmarks bar</span>
                            </label>
                        </div>

                        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="font-medium mb-4 dark:text-gray-200">Startup</h3>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="homepage"
                                        checked={settings.homePage === PAGES.NEWTAB}
                                        onChange={() => setSettings(s => ({ ...s, homePage: PAGES.NEWTAB }))}
                                    />
                                    <span className="dark:text-gray-300">Open New Tab page</span>
                                </label>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="homepage"
                                        checked={settings.homePage === GOOGLE_HOME_URL}
                                        onChange={() => setSettings(s => ({ ...s, homePage: GOOGLE_HOME_URL }))}
                                    />
                                    <span className="dark:text-gray-300">Open Google</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="font-medium mb-4 dark:text-gray-200">Data</h3>
                            <button
                                onClick={() => {
                                    setGlobalHistory([])
                                    setDownloads([])
                                    setBookmarks([])
                                }}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                                Clear Browsing Data
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return null
    }

    // --- Render ---

    return (
        <div className="flex flex-col h-full bg-[#dfe3e7] dark:bg-[#111] text-black dark:text-white font-sans select-none pt-10" onClick={() => setShowMenu(false)}>
            {/* Tab Bar */}
            <div className="flex items-end px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
                <AnimatePresence initial={false}>
                    {tabs.map(tab => (
                        <motion.div
                            key={tab.id}
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, width: 0 }}
                            className={`
                                group relative flex items-center gap-2 px-3 py-2 min-w-[160px] max-w-[240px] h-[36px] 
                                rounded-t-lg text-xs transition-colors cursor-default
                                ${tab.id === activeTabId
                                    ? 'bg-white dark:bg-[#202020] text-gray-800 dark:text-gray-200 shadow-sm z-10'
                                    : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/10'
                                }
                            `}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            <Globe size={14} className={tab.id === activeTabId ? 'text-blue-500' : 'text-gray-400'} />
                            <span className="flex-1 truncate font-medium">{tab.title || t('browser.loading')}</span>
                            <button
                                onClick={(e) => handleCloseTab(e, tab.id)}
                                className={`
                                    p-0.5 rounded-full hover:bg-gray-200/80 dark:hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity
                                    ${tab.id === activeTabId ? 'opacity-100' : ''}
                                `}
                            >
                                <X size={12} />
                            </button>

                            {tab.id !== activeTabId && (
                                <div className="absolute right-[-1px] top-2 bottom-2 w-[1px] bg-gray-300/50 dark:bg-white/10" />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                <button
                    onClick={handleNewTab}
                    className="p-1.5 ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#202020] border-b border-gray-200 dark:border-gray-700 shrink-0 z-20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex gap-1">
                    <button
                        onClick={handleGoBack}
                        disabled={activeTab.historyIndex <= 0}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button
                        onClick={handleGoForward}
                        disabled={activeTab.historyIndex >= activeTab.history.length - 1}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={handleRefresh}
                        className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors ${activeTab.isLoading ? 'animate-spin' : ''}`}
                    >
                        <RotateCw size={16} />
                    </button>
                    <button
                        onClick={handleHome}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <Home size={16} />
                    </button>
                </div>

                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-[#111] rounded-full border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-[#1a1a1a] focus-within:shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all">
                    {activeTab.url.startsWith('https') ? (
                        <div className="text-green-600 dark:text-green-500"><Globe size={14} /></div>
                    ) : (
                        <Search size={14} className="text-gray-400" />
                    )}
                    <form onSubmit={handleNavigate} className="flex-1 min-w-0">
                        <input
                            className="w-full bg-transparent outline-none text-sm min-w-0 placeholder-gray-400 dark:text-gray-200"
                            value={activeTab.inputUrl}
                            onChange={(e) => updateTab(activeTabId, { inputUrl: e.target.value })}
                            onFocus={(e) => e.target.select()}
                            placeholder={t('browser.search')}
                        />
                    </form>
                    <button onClick={toggleBookmark} className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${isBookmarked ? 'text-blue-500' : 'text-gray-400'}`}>
                        <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                        className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors ${showMenu ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                    >
                        <MoreVertical size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={() => handleNewTab()} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <Plus size={14} /> New Tab
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                            <button onClick={() => navigateTo(PAGES.HISTORY)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <Clock size={14} /> History
                            </button>
                            <button onClick={() => navigateTo(PAGES.BOOKMARKS)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <Bookmark size={14} /> Bookmarks
                            </button>
                            <button onClick={() => navigateTo(PAGES.DOWNLOADS)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <Download size={14} /> Downloads
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                            <button onClick={handleDownloadRequest} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <HardDrive size={14} /> Save Page As...
                            </button>
                            <button onClick={() => navigateTo(PAGES.SETTINGS)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 dark:text-gray-200">
                                <Settings size={14} /> Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white dark:bg-[#111] overflow-hidden">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`absolute inset-0 w-full h-full bg-white dark:bg-[#111] ${tab.id === activeTabId ? 'z-10 visible' : 'z-0 invisible'}`}
                    >
                        {tab.isLoading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 z-20">
                                <div className="h-full bg-blue-500 animate-progress-indeterminate" />
                            </div>
                        )}

                        {tab.url.startsWith(INTERNAL_PREFIX) ? (
                            <InternalPage url={tab.url} />
                        ) : (
                            <iframe
                                ref={el => { iframeRefs.current[tab.id] = el }}
                                src={tab.url.startsWith('http') && !tab.url.includes('localhost') ? `/api/proxy?url=${encodeURIComponent(tab.url)}` : tab.url}
                                className="w-full h-full border-none block bg-white"
                                onLoad={() => handleIframeLoad(tab.id)}
                                onError={() => handleIframeLoad(tab.id)}
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                                title={`${t('browser.tab')} ${tab.title}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                        )}
                    </div>
                ))}
            </div>

            <FilePickerDialog
                isOpen={pickerOpen}
                mode="save"
                title="Save Page As"
                defaultFileName={pendingDownload?.name}
                onConfirm={handleDownloadConfirm}
                onCancel={() => { setPickerOpen(false); setPendingDownload(null) }}
            />
        </div>
    )
}
