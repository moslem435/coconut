import { AppManifest } from '@/os/registry/types'
import { Bot } from 'lucide-react'
import dynamic from 'next/dynamic'

const AIChat = dynamic(() => import('./index'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading AI Core...</div>
})

export const manifest: AppManifest = {
    id: 'ai-chat',
    title: 'app.ai-chat',
    icon: Bot,
    theme: {
        backgroundColor: '#1e1e1e',
        iconColor: '#3b82f6', // Blue-500
        lineColor: '#60a5fa' // Blue-400
    },
    component: AIChat,
    defaultWindowOptions: {
        width: 400,
        height: '100%',
        titleBarColor: 'auto',
        isSidebar: true, // Enable Copilot mode
        hideTitleBar: true
    }
}
