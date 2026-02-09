import { AppManifest } from '@/os/registry/types'
import { Code2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const VSCodeLite = dynamic(() => import('./index'), { ssr: false })

export const manifest: AppManifest = {
  id: 'vscode-lite',
  title: 'VS Code',
  icon: Code2,
  component: VSCodeLite,
  defaultWindowOptions: {
    width: 900,
    height: 600,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'light'
  }
}
