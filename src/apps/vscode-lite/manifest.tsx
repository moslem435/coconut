import { AppManifest } from '@/os/registry/types'
import { Code2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const VSCodeLite = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Editor...</div>
})

export const manifest: AppManifest = {
  id: 'vscode-lite',
  title: 'VS Code',
  icon: Code2,
  theme: {
        backgroundColor: '#4f46e5',
        iconColor: '#ffffff',
        lineColor: '#818cf8' // Indigo-400
    },
  component: VSCodeLite,
  defaultWindowOptions: {
    width: 1200,
    height: 800,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'light'
  }
}
