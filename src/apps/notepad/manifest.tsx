import { AppManifest } from '@/os/registry/types'
import { StickyNote } from 'lucide-react'
import Notepad from './index'

export const manifest: AppManifest = {
    id: 'notepad',
    title: 'Notepad',
    icon: StickyNote,
    theme: {
        backgroundColor: '#eab308',
        iconColor: '#000000',
        lineColor: '#facc15' // Yellow-400
    },
    component: Notepad,
    defaultWindowOptions: {
        width: 600,
        height: 400,
        titleBarColor: 'dark'
    }
}
