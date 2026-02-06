import { AppManifest } from './types'
import { manifest as PortfolioManifest } from '@/apps/portfolio-hub/manifest'
import { manifest as SettingsManifest } from '@/apps/settings/manifest'
import { manifest as ArchiveManifest } from '@/apps/archive/manifest'
import { manifest as NetworkManifest } from '@/apps/network/manifest'
import { manifest as TrashManifest } from '@/apps/trash/manifest'

// Re-export for compatibility
export type { AppManifest as AppConfig } from './types'

export const APPS_REGISTRY: Record<string, AppManifest> = {
  [PortfolioManifest.id]: PortfolioManifest,
  [SettingsManifest.id]: SettingsManifest,
  [ArchiveManifest.id]: ArchiveManifest,
  [NetworkManifest.id]: NetworkManifest,
  [TrashManifest.id]: TrashManifest,
}

export type AppId = keyof typeof APPS_REGISTRY
