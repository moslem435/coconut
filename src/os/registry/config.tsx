import { AppManifest } from './types'
import { manifest as PortfolioManifest } from '@/apps/portfolio-hub/manifest'
import { manifest as SettingsManifest } from '@/apps/settings/manifest'
import { manifest as FileExplorerManifest } from '@/apps/file-explorer/manifest'
import { manifest as BrowserManifest } from '@/apps/browser/manifest'
import { manifest as TerminalManifest } from '@/apps/terminal/manifest'
import { manifest as CalculatorManifest } from '@/apps/calculator/manifest'
import { manifest as NotepadManifest } from '@/apps/notepad/manifest'
import { manifest as RecycleBinManifest } from '@/apps/recycle-bin/manifest'

// Re-export for compatibility
export type { AppManifest as AppConfig } from './types'

export const APPS_REGISTRY: Record<string, AppManifest> = {
  [PortfolioManifest.id]: PortfolioManifest,
  [SettingsManifest.id]: SettingsManifest,
  [FileExplorerManifest.id]: FileExplorerManifest,
  [BrowserManifest.id]: BrowserManifest,
  [TerminalManifest.id]: TerminalManifest,
  [CalculatorManifest.id]: CalculatorManifest,
  [NotepadManifest.id]: NotepadManifest,
  [RecycleBinManifest.id]: RecycleBinManifest,
}

export type AppId = keyof typeof APPS_REGISTRY
