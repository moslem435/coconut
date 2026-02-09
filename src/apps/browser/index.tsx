import { useState, useRef, useEffect, FormEvent } from 'react'
import { 
    ArrowLeft, 
    ArrowRight, 
    RotateCw, 
    Search, 
    Home, 
    Plus, 
    X, 
    Globe, 
    AlertCircle,
    ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// --- Types ---

interface HistoryEntry {
    url: string
    timestamp: number
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

// --- Utils ---

const generateId = () => Math.random().toString(36).substring(2, 9)

const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q='
const HOME_URL = 'https://www.google.com/webhp?igu=1' // Google capable of running in iframe

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
    
    // Check if it's a likely domain (e.g., example.com) or localhost
    const domainRegex = /^(?:[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|localhost(?::\d+)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?)(?:\/[^\s]*)?$/
    
    if (isValidUrl(trimmed)) return trimmed
    if (isValidUrl(`https://${trimmed}`)) return `https://${trimmed}`
    
    // If it looks like a domain but missing protocol, add https
    if (domainRegex.test(trimmed)) {
        return `https://${trimmed}`
    }

    // Otherwise treat as search query
    return `${GOOGLE_SEARCH_URL}${encodeURIComponent(trimmed)}`
}

// --- Components ---

export default function Browser() {
    // --- State ---
    const [tabs, setTabs] = useState<Tab[]>([{
        id: generateId(),
        title: 'New Tab',
        url: HOME_URL,
        history: [HOME_URL],
        historyIndex: 0,
        isLoading: true,
        inputUrl: HOME_URL
    }])
    const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id)
    
    // Refs for iframes to handle refresh
    const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({})

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

    // --- Actions ---

    const updateTab = (id: string, updates: Partial<Tab>) => {
        setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, ...updates } : tab))
    }

    const handleNewTab = () => {
        const newTab: Tab = {
            id: generateId(),
            title: 'New Tab',
            url: HOME_URL,
            history: [HOME_URL],
            historyIndex: 0,
            isLoading: true,
            inputUrl: ''
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
    }

    const handleCloseTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (tabs.length === 1) {
            // Don't close the last tab, just reset it
            updateTab(id, {
                url: HOME_URL,
                history: [HOME_URL],
                historyIndex: 0,
                isLoading: true,
                inputUrl: HOME_URL,
                title: 'New Tab'
            })
            return
        }

        const newTabs = tabs.filter(t => t.id !== id)
        setTabs(newTabs)
        
        // If we closed the active tab, switch to the last one
        if (id === activeTabId) {
            setActiveTabId(newTabs[newTabs.length - 1].id)
        }
    }

    const handleNavigate = (e?: FormEvent) => {
        e?.preventDefault()
        const targetUrl = formatUrl(activeTab.inputUrl)
        
        // Update history
        const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1)
        newHistory.push(targetUrl)

        updateTab(activeTabId, {
            url: targetUrl,
            inputUrl: targetUrl, // Normalize input to resolved URL
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: true,
            title: targetUrl // Temporary title until loaded
        })
    }

    const handleGoBack = () => {
        if (activeTab.historyIndex > 0) {
            const newIndex = activeTab.historyIndex - 1
            const newUrl = activeTab.history[newIndex]
            updateTab(activeTabId, {
                historyIndex: newIndex,
                url: newUrl,
                inputUrl: newUrl,
                isLoading: true
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
                isLoading: true
            })
        }
    }

    const handleRefresh = () => {
        const iframe = iframeRefs.current[activeTabId]
        if (iframe) {
            // Force iframe reload
            iframe.src = iframe.src
            updateTab(activeTabId, { isLoading: true })
        }
    }

    const handleHome = () => {
        updateTab(activeTabId, { inputUrl: HOME_URL })
        // Need to trigger navigation after state update, but for simplicity we just call the logic
        // Actually, let's just directly update the tab state to navigate
        const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1)
        newHistory.push(HOME_URL)
        updateTab(activeTabId, {
            url: HOME_URL,
            inputUrl: HOME_URL,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: true,
            title: 'New Tab'
        })
    }

    const handleIframeLoad = (id: string) => {
        updateTab(id, { isLoading: false })
    }

    // --- Render ---

    return (
        <div className="flex flex-col h-full bg-[#dfe3e7] text-black font-sans select-none">
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
                                    ? 'bg-white text-gray-800 shadow-sm z-10' 
                                    : 'bg-transparent text-gray-600 hover:bg-white/40'
                                }
                            `}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            <Globe size={14} className={tab.id === activeTabId ? 'text-blue-500' : 'text-gray-400'} />
                            <span className="flex-1 truncate font-medium">{tab.title || 'Loading...'}</span>
                            <button 
                                onClick={(e) => handleCloseTab(e, tab.id)}
                                className={`
                                    p-0.5 rounded-full hover:bg-gray-200/80 opacity-0 group-hover:opacity-100 transition-opacity
                                    ${tab.id === activeTabId ? 'opacity-100' : ''}
                                `}
                            >
                                <X size={12} />
                            </button>
                            
                            {/* Separator for inactive tabs */}
                            {tab.id !== activeTabId && (
                                <div className="absolute right-[-1px] top-2 bottom-2 w-[1px] bg-gray-300/50" />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                <button 
                    onClick={handleNewTab}
                    className="p-1.5 ml-1 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200 shrink-0 z-20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex gap-1">
                    <button 
                        onClick={handleGoBack} 
                        disabled={activeTab.historyIndex <= 0}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button 
                        onClick={handleGoForward}
                        disabled={activeTab.historyIndex >= activeTab.history.length - 1}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button 
                        onClick={handleRefresh} 
                        className={`p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors ${activeTab.isLoading ? 'animate-spin' : ''}`}
                    >
                        <RotateCw size={16} />
                    </button>
                    <button 
                        onClick={handleHome}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <Home size={16} />
                    </button>
                </div>

                <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-transparent focus-within:border-blue-500/50 focus-within:bg-white focus-within:shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Search size={14} className="text-gray-400" />
                    <input 
                        className="flex-1 bg-transparent outline-none text-sm min-w-0 placeholder-gray-400"
                        value={activeTab.inputUrl}
                        onChange={(e) => updateTab(activeTabId, { inputUrl: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        placeholder="Search Google or type a URL"
                    />
                </form>

                <a 
                    href={activeTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors tooltip-trigger"
                    title="Open in real browser"
                >
                    <ExternalLink size={16} />
                </a>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white overflow-hidden">
                {tabs.map(tab => (
                    <div 
                        key={tab.id}
                        className={`absolute inset-0 w-full h-full bg-white ${tab.id === activeTabId ? 'z-10 visible' : 'z-0 invisible'}`}
                    >
                        {tab.isLoading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 z-20">
                                <div className="h-full bg-blue-500 animate-progress-indeterminate" />
                            </div>
                        )}
                        
                        {/* Iframe Restriction Warning Overlay (Optional enhancement: Show if iframe fails?) 
                            Since we can't easily detect x-frame-options, we rely on the user using the External Link button.
                            However, we can show a subtle hint at the bottom if it takes too long? 
                            For now, let's keep it clean.
                        */}

                        <iframe 
                            ref={el => { iframeRefs.current[tab.id] = el }}
                            src={tab.url}
                            className="w-full h-full border-none block"
                            onLoad={() => handleIframeLoad(tab.id)}
                            onError={() => handleIframeLoad(tab.id)} // Stop loading spinner on error too
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                            title={`Browser Tab ${tab.title}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
