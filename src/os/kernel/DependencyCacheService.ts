import { SYSTEM_PATHS } from '@/os/config/paths'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { TarService, type WebContainerFs } from '@/os/utils/TarService'

type CacheIndexEntry = {
  key: string
  format: 'tar' | 'dir'
  artifactPath: string
  sizeBytes: number
  createdAt: number
  lastAccessAt: number
  source: 'lockfile' | 'package-json'
  sourceName: string
}

type CacheIndex = {
  version: number
  totalSizeBytes: number
  entries: Record<string, CacheIndexEntry>
}

const CACHE_VERSION = 1
const CACHE_DIR = `${SYSTEM_PATHS.USER}/.cache/deps`
const INDEX_PATH = `${CACHE_DIR}/index.json`
const DEFAULT_MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024
const DIR_SNAPSHOT_VERSION = 1
const IO_RATE_LIMIT_BYTES_PER_SEC = 12 * 1024 * 1024

const inflightDirSnapshots = new Map<string, Promise<void>>()

async function rateLimit(bytes: number): Promise<void> {
  const g = globalThis as any
  const now = Date.now()
  const state = g.__depCacheIoRateLimit ?? { lastAt: now, budget: IO_RATE_LIMIT_BYTES_PER_SEC }
  const elapsedMs = Math.max(0, now - state.lastAt)
  state.budget = Math.min(IO_RATE_LIMIT_BYTES_PER_SEC, state.budget + (elapsedMs / 1000) * IO_RATE_LIMIT_BYTES_PER_SEC)
  state.lastAt = now

  const need = Math.min(IO_RATE_LIMIT_BYTES_PER_SEC, Math.max(0, bytes))
  if (state.budget < need) {
    const deficit = need - state.budget
    const waitMs = Math.ceil((deficit / IO_RATE_LIMIT_BYTES_PER_SEC) * 1000)
    g.__depCacheIoRateLimit = state
    await new Promise((r) => setTimeout(r, waitMs))
    return
  }

  state.budget -= need
  g.__depCacheIoRateLimit = state
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return bytesToBase64Url(new Uint8Array(digest))
}

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
  return `{${parts.join(',')}}`
}

function normalizePackageJsonForKey(packageJsonText: string): string | null {
  try {
    const pkg = JSON.parse(packageJsonText)
    const normalized = {
      name: pkg?.name ?? null,
      dependencies: pkg?.dependencies ?? {},
      devDependencies: pkg?.devDependencies ?? {},
      peerDependencies: pkg?.peerDependencies ?? {},
      optionalDependencies: pkg?.optionalDependencies ?? {},
    }
    return stableStringify(normalized)
  } catch {
    return null
  }
}

async function decodeUtf8(bytes: Uint8Array): Promise<string> {
  return new TextDecoder().decode(bytes)
}

async function readIndex(): Promise<CacheIndex> {
  try {
    const raw = await fs.readFile(INDEX_PATH)
    const text = await decodeUtf8(raw)
    const parsed = JSON.parse(text) as CacheIndex
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid index')
    if (parsed.version !== CACHE_VERSION) {
      return { version: CACHE_VERSION, totalSizeBytes: 0, entries: {} }
    }
    return {
      version: CACHE_VERSION,
      totalSizeBytes: parsed.totalSizeBytes ?? 0,
      entries: parsed.entries ?? {},
    }
  } catch {
    return { version: CACHE_VERSION, totalSizeBytes: 0, entries: {} }
  }
}

async function writeIndex(index: CacheIndex): Promise<void> {
  await fs.mkdir(CACHE_DIR, true)
  await fs.writeFile(INDEX_PATH, JSON.stringify(index))
}

export class DependencyCacheService {
  static async ensureCacheDir(): Promise<void> {
    await fs.mkdir(CACHE_DIR, true)
    await fs.mkdir(`${SYSTEM_PATHS.USER}/.cache/npm`, true)
    if (!(await fs.exists(INDEX_PATH))) {
      const index: CacheIndex = { version: CACHE_VERSION, totalSizeBytes: 0, entries: {} }
      await fs.writeFile(INDEX_PATH, JSON.stringify(index))
    }
  }

  static async computeCacheKeyFromTexts(input: {
    lockfileName?: string
    lockfileText?: string
    packageJsonText?: string
  }): Promise<{ key: string; source: CacheIndexEntry['source']; sourceName: string } | null> {
    const lockfileText = input.lockfileText
    if (input.lockfileName && lockfileText && lockfileText.trim()) {
      const digest = await sha256Base64Url(`dep-cache:v${CACHE_VERSION}\nlockfile:${input.lockfileName}\n${lockfileText}`)
      return { key: `dep-${CACHE_VERSION}-${digest}`, source: 'lockfile', sourceName: input.lockfileName }
    }

    if (input.packageJsonText && input.packageJsonText.trim()) {
      const normalized = normalizePackageJsonForKey(input.packageJsonText) ?? input.packageJsonText
      const digest = await sha256Base64Url(`dep-cache:v${CACHE_VERSION}\npackage.json\n${normalized}`)
      return { key: `dep-${CACHE_VERSION}-${digest}`, source: 'package-json', sourceName: 'package.json' }
    }

    return null
  }

  static async computeCacheKeyFromWebContainerFs(
    wcFs: { readFile: (path: string) => Promise<Uint8Array> },
    appPath: string,
    options: { preferPackageJson?: boolean } = {}
  ): Promise<{ key: string; source: CacheIndexEntry['source']; sourceName: string } | null> {
    if (options.preferPackageJson) {
      try {
        const pkgBytes = await wcFs.readFile(`${appPath}/package.json`)
        const pkgText = await decodeUtf8(pkgBytes)
        const pkgKey = await DependencyCacheService.computeCacheKeyFromTexts({ packageJsonText: pkgText })
        if (pkgKey) return pkgKey
      } catch {}
    }

    const candidates = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']
    for (const name of candidates) {
      try {
        const bytes = await wcFs.readFile(`${appPath}/${name}`)
        const text = await decodeUtf8(bytes)
        const result = await DependencyCacheService.computeCacheKeyFromTexts({ lockfileName: name, lockfileText: text })
        if (result) return result
      } catch {}
    }

    try {
      const pkgBytes = await wcFs.readFile(`${appPath}/package.json`)
      const pkgText = await decodeUtf8(pkgBytes)
      return await DependencyCacheService.computeCacheKeyFromTexts({ packageJsonText: pkgText })
    } catch {
      return null
    }
  }

  static tarPathForKey(key: string): string {
    return `${CACHE_DIR}/${key}.tar`
  }

  static dirSnapshotRootForKey(key: string): string {
    return `${CACHE_DIR}/${key}`
  }

  static dirSnapshotManifestForKey(key: string): string {
    return `${CACHE_DIR}/${key}/manifest.json`
  }

  static dirSnapshotProgressForKey(key: string): string {
    return `${CACHE_DIR}/${key}/progress.json`
  }

  static legacyTarPathForWcAppPath(appPath: string): string {
    const base = appPath.endsWith('/') ? appPath.slice(0, -1) : appPath
    return `${base}/node_modules.tar`
  }

  static async hasSnapshot(key: string): Promise<boolean> {
    const tarPath = DependencyCacheService.tarPathForKey(key)
    return fs.exists(tarPath)
  }

  static async hasDirSnapshot(key: string): Promise<boolean> {
    return fs.exists(DependencyCacheService.dirSnapshotManifestForKey(key))
  }

  static async isDirSnapshotComplete(key: string): Promise<boolean> {
    // Deprecated logic
    return false
  }

  static async hasLegacySnapshot(appPath: string): Promise<boolean> {
    return false
  }

  static async readSnapshot(key: string): Promise<Uint8Array | null> {
    const tarPath = DependencyCacheService.tarPathForKey(key)
    try {
      const data = await fs.readFile(tarPath)
      const index = await readIndex()
      const entry = index.entries[key]
      if (entry) {
        entry.lastAccessAt = Date.now()
        index.entries[key] = entry
        await writeIndex(index)
      }
      return data
    } catch {
      return null
    }
  }

  static async restoreSnapshot(input: {
    key: string
    wcFs: WebContainerFs
    appPath: string
  }): Promise<boolean> {
    const tarPath = DependencyCacheService.tarPathForKey(input.key)
    try {
      const tarBytes = await fs.readFile(tarPath)
      
      const wcBase = `${input.appPath}/node_modules`
      await TarService.extractTarToWebContainer(
        tarBytes.buffer as ArrayBuffer, 
        input.wcFs, 
        wcBase,
        (count) => {
          // Optional: we could report progress here
          // console.log(`[DepCache] Extracted ${count} files from tar`)
        }
      )

      const index = await readIndex()
      const entry = index.entries[input.key]
      if (entry) {
        entry.lastAccessAt = Date.now()
        index.entries[input.key] = entry
        await writeIndex(index)
      }
      return true
    } catch (e) {
      console.error('[DepCache] Restore snapshot failed:', e)
      return false
    }
  }

  static async restoreDirSnapshotToWebContainerFs(_input: {
    key: string
    wcFs: WebContainerFs
    appPath: string
  }): Promise<boolean> {
    return false
  }

  // Deprecated: Removed old directory snapshot logic to prevent SyncWrite spam
  // static async restoreDirSnapshotToWebContainerFs...
  
  // Deprecated: Removed old directory snapshot save logic
  // static async saveDirSnapshotFromWebContainerFs...

  static async readLegacySnapshot(appPath: string): Promise<Uint8Array | null> {
    return null
  }

  static async saveSnapshot(input: {
    key: string
    wcFs: any // We need to read from WC FS to create tar
    appPath: string
    source: CacheIndexEntry['source']
    sourceName: string
    maxCacheBytes?: number
  }): Promise<void> {
    const existing = inflightDirSnapshots.get(input.key)
    if (existing) return existing

    const job = (async () => {
      console.time(`[DepCache] Save Snapshot ${input.key}`)
      
      // 1. Check if already cached
      if (await DependencyCacheService.hasSnapshot(input.key)) {
         console.timeEnd(`[DepCache] Save Snapshot ${input.key}`)
         return
      }

      // 2. Create Tar in memory (using fflate)
      // Note: For huge node_modules, this might hit memory limits. 
      // But fflate is efficient.
      const nodeModulesPath = `${input.appPath}/node_modules`
      let tarBytes: Uint8Array
      try {
        console.time('[DepCache] Create Tar')
        // Optimization: Exclude .vite cache from snapshot to force fresh pre-bundling on restore
        // This fixes "stale optimization" issues where Vite hangs on old metadata
        tarBytes = await TarService.createTarFromWebContainer(input.wcFs, nodeModulesPath)
        console.timeEnd('[DepCache] Create Tar')
      } catch (e) {
        console.error('[DepCache] Failed to create tar snapshot:', e)
        console.timeEnd(`[DepCache] Save Snapshot ${input.key}`)
        throw e // Re-throw to ensure caller knows snapshot failed
      }

      // 3. Save Tar to OPFS
      await fs.mkdir(CACHE_DIR, true)
      const tarPath = DependencyCacheService.tarPathForKey(input.key)
      await fs.writeFile(tarPath, tarBytes)

      // 4. Update Index
      const now = Date.now()
      const index = await readIndex()
      const sizeBytes = tarBytes.byteLength
      
      index.entries[input.key] = {
        key: input.key,
        format: 'tar',
        artifactPath: tarPath,
        sizeBytes,
        createdAt: now,
        lastAccessAt: now,
        source: input.source,
        sourceName: input.sourceName,
      }
      
      const total = Object.values(index.entries).reduce((sum, e) => sum + (e.sizeBytes || 0), 0)
      index.totalSizeBytes = total
      await writeIndex(index)

      // 5. Prune if needed
      await DependencyCacheService.prune(input.maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES)
    })()

    inflightDirSnapshots.set(input.key, job)
    try {
      await job
    } finally {
      inflightDirSnapshots.delete(input.key)
    }
  }

  static async prune(maxBytes: number): Promise<void> {
    const index = await readIndex()
    const entries = Object.values(index.entries)
    const total = entries.reduce((sum, e) => sum + (e.sizeBytes || 0), 0)
    if (total <= maxBytes) {
      index.totalSizeBytes = total
      await writeIndex(index)
      return
    }

    const sorted = entries.sort((a, b) => (a.lastAccessAt ?? 0) - (b.lastAccessAt ?? 0))
    let remaining = total
    for (const e of sorted) {
      if (remaining <= maxBytes) break
      try {
        if (e.format === 'dir') {
          await fs.unlink(DependencyCacheService.dirSnapshotRootForKey(e.key), true)
        } else {
          await fs.unlink(e.artifactPath, false)
        }
      } catch {}
      delete index.entries[e.key]
      remaining -= e.sizeBytes || 0
    }

    index.totalSizeBytes = Math.max(0, remaining)
    await writeIndex(index)
  }
}
