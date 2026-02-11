import { AppManifest } from './types'
import { manifest as PortfolioManifest } from '@/apps/portfolio-hub/manifest'
import { manifest as SettingsManifest } from '@/apps/settings/manifest'
import { manifest as FileExplorerManifest } from '@/apps/file-explorer/manifest'
import { manifest as BrowserManifest } from '@/apps/browser/manifest'
import { manifest as TerminalManifest } from '@/apps/terminal/manifest'
import { manifest as NotepadManifest } from '@/apps/notepad/manifest'
import { manifest as RecycleBinManifest } from '@/apps/recycle-bin/manifest'
import { manifest as PhotoGalleryManifest } from '@/apps/photo-gallery/manifest'
import { manifest as ResumeManifest } from '@/apps/resume/manifest'
import { manifest as ContactManifest } from '@/apps/contact/manifest'
import { manifest as MusicPlayerManifest } from '@/apps/music-player/manifest'
import { manifest as WeatherManifest } from '@/apps/weather/manifest'
import { manifest as VSCodeLiteManifest } from '@/apps/vscode-lite/manifest'

// Re-export for compatibility
export type { AppManifest as AppConfig } from './types'

export const APPS_REGISTRY: Record<string, AppManifest> = {
  [PortfolioManifest.id]: PortfolioManifest,
  [SettingsManifest.id]: SettingsManifest,
  [FileExplorerManifest.id]: FileExplorerManifest,
  [BrowserManifest.id]: BrowserManifest,
  [TerminalManifest.id]: TerminalManifest,
  [NotepadManifest.id]: NotepadManifest,
  [RecycleBinManifest.id]: RecycleBinManifest,
  [PhotoGalleryManifest.id]: PhotoGalleryManifest,
  [ResumeManifest.id]: ResumeManifest,
  [ContactManifest.id]: ContactManifest,
  [MusicPlayerManifest.id]: MusicPlayerManifest,
  [WeatherManifest.id]: WeatherManifest,
  [VSCodeLiteManifest.id]: VSCodeLiteManifest,
}

export type AppId = keyof typeof APPS_REGISTRY
