import { AppManifest } from '@/os/registry/types'
import { TerminalSquare } from 'lucide-react'
import Terminal from './index'

export const manifest: AppManifest = {
    id: 'terminal',
    title: 'Terminal',
    icon: TerminalSquare,
    component: Terminal,
    defaultWindowOptions: {
        size: { width: 800, height: 500 },
        taskbarPosition: { x: 0, y: 0 }
    }
}
