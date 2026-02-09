import { AppManifest } from './types'
import { manifest as PortfolioManifest } from '@/apps/portfolio-hub/manifest'
import { manifest as SettingsManifest } from '@/apps/settings/manifest'
import { manifest as FileExplorerManifest } from '@/apps/file-explorer/manifest'
import { manifest as BrowserManifest } from '@/apps/browser/manifest'

// Re-export for compatibility
export type { AppManifest as AppConfig } from './types'

export const APPS_REGISTRY: Record<string, AppManifest> = {
  [PortfolioManifest.id]: PortfolioManifest,
  [SettingsManifest.id]: SettingsManifest,
  [FileExplorerManifest.id]: FileExplorerManifest,
  [BrowserManifest.id]: BrowserManifest,
}

export type AppId = keyof typeof APPS_REGISTRY
