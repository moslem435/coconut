import { AppManifest } from '@/os/registry/types'
import { StickyNote } from 'lucide-react'
import Notepad from './index'

export const manifest: AppManifest = {
    id: 'notepad',
    title: 'Notepad',
    icon: StickyNote,
    component: Notepad,
    defaultWindowOptions: {
        size: { width: 600, height: 400 },
        taskbarPosition: { x: 0, y: 0 },
        titleBarColor: 'dark'
    }
}
