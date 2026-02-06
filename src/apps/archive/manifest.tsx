import dynamic from 'next/dynamic'
import { FolderOpen } from 'lucide-react'
import { AppManifest } from '@/os/registry/types'

const ArchiveApp = dynamic(() => import('./index'))

export const manifest: AppManifest = {
    id: 'archive',
    title: 'ARCHIVE',
    icon: FolderOpen,
    component: ArchiveApp,
    defaultWindowOptions: {
        width: 800,
        height: 600
    }
}
