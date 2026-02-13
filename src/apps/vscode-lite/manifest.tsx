import { AppManifest } from '@/os/registry/types'
import { Code2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const VSCode = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-white/50">Loading Editor...</div>
})

export const manifest: AppManifest = {
  id: 'vscode-lite',
  title: 'VS Code',
  icon: Code2,
  theme: {
    backgroundColor: '#007acc', // Official VS Code Blue
    iconColor: '#ffffff',
    lineColor: '#3399ff'
  },
  component: VSCode,
  defaultWindowOptions: {
    width: 1200,
    height: 800,
    isResizable: true,
    isMaximized: false,
    titleBarColor: 'light',
    hideTitleBar: true
  }
}
