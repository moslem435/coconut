import { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { Terminal, FolderOpen, Globe, Trash, Settings } from 'lucide-react'

// Dynamic Imports for Code Splitting / Lazy Loading
const Portfolio = dynamic(() => import('@/apps/portfolio-hub'), {
  loading: () => <div className="flex items-center justify-center h-full text-cyan-500 font-mono animate-pulse">LOADING SYSTEM CORE...</div>
})

export interface AppConfig {
  id: string
  title: string
  icon: ComponentType<any>
  component: ComponentType<any>
  defaultWindowOptions?: {
    width?: number
    height?: number
    isMaximized?: boolean
    isResizable?: boolean
  }
}

export const APPS_REGISTRY: Record<string, AppConfig> = {
  'system-core': {
    id: 'system-core',
    title: 'PORTFOLIO_HUB',
    icon: Terminal,
    component: Portfolio,
    defaultWindowOptions: {
      isMaximized: true
    }
  },
  'settings': {
    id: 'settings',
    title: 'SETTINGS',
    icon: Settings,
    component: dynamic(() => import('@/apps/settings')),
    defaultWindowOptions: {
      width: 900,
      height: 600
    }
  },
  'archive': {
    id: 'archive',
    title: 'ARCHIVE',
    icon: FolderOpen,
    component: dynamic(() => import('@/apps/archive')),
    defaultWindowOptions: {
      width: 800,
      height: 600
    }
  },
  'network': {
    id: 'network',
    title: 'NET_NODE',
    icon: Globe,
    component: dynamic(() => import('@/apps/network')),
    defaultWindowOptions: {
      width: 800,
      height: 600
    }
  },
  'trash': {
    id: 'trash',
    title: 'PURGE',
    icon: Trash,
    component: dynamic(() => import('@/apps/trash')),
    defaultWindowOptions: {
      width: 600,
      height: 400
    }
  }
}

export type AppId = keyof typeof APPS_REGISTRY
