import { AppManifest } from '@/os/registry/types'
import { FileText } from 'lucide-react'
import dynamic from 'next/dynamic'

const ResumeApp = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'resume',
  title: 'Resume',
  icon: FileText,
  component: ResumeApp,
  defaultWindowOptions: {
    width: 850,
    height: 900,
    isResizable: true,
    isMaximized: true
  }
}
