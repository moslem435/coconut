import { AppManifest } from './types'

/**
 * Centralized App Registry
 * 
 * To add a new app:
 * 1. Create your app in /src/apps/{app-name}/
 * 2. Create manifest.tsx with exported `manifest`
 * 3. Add ONE line below using the register() helper
 */

const registry: Record<string, AppManifest> = {}

// Helper to simplify registration (reduces boilerplate)
const register = (manifest: AppManifest) => (registry[manifest.id] = manifest, manifest)

// Register all apps (one concise line per app)
register(require('@/apps/portfolio-hub/manifest').manifest)
register(require('@/apps/settings/manifest').manifest)
register(require('@/apps/file-explorer/manifest').manifest)
register(require('@/apps/terminal/manifest').manifest)
register(require('@/apps/notepad/manifest').manifest)
register(require('@/apps/recycle-bin/manifest').manifest)
register(require('@/apps/photo-gallery/manifest').manifest)
register(require('@/apps/music-player/manifest').manifest)
register(require('@/apps/weather/manifest').manifest)
register(require('@/apps/vscode-lite/manifest').manifest)
register(require('@/apps/sandbox-test/manifest').manifest)
register(require('@/apps/task-manager/manifest').manifest)

export const APPS_REGISTRY = registry
export type { AppManifest as AppConfig } from './types'
export type AppId = keyof typeof APPS_REGISTRY
