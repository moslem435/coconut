import { AppManifest } from '@/os/registry/types'
import { TerminalSquare } from 'lucide-react'
import Terminal from './index'

export const manifest: AppManifest = {
    id: 'terminal',
    title: 'Terminal',
    icon: TerminalSquare,
    theme: {
        backgroundColor: '#333333',
        iconColor: '#ffffff',
        lineColor: '#e5e7eb' // Gray-200
    },
    component: Terminal,
    defaultWindowOptions: {
        width: 900,
        height: 600
    }
}
