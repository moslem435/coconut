import { AppManifest } from './types'
import { manifest as PortfolioManifest } from '@/apps/portfolio-hub/manifest'
import { manifest as SettingsManifest } from '@/apps/settings/manifest'

// Re-export for compatibility
export type { AppManifest as AppConfig } from './types'

export const APPS_REGISTRY: Record<string, AppManifest> = {
  [PortfolioManifest.id]: PortfolioManifest,
  [SettingsManifest.id]: SettingsManifest,
}

export type AppId = keyof typeof APPS_REGISTRY
