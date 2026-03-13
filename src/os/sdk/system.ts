import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useSystemSettingsStore, ThemeMode } from '@/os/kernel/useSystemSettingsStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { v4 as uuidv4 } from 'uuid'

// Locks to prevent concurrent operations on the same directory paths
const pathLocks = new Map<string, Promise<string>>();

export const System = {
  fs: {
    readFile: async (path: string) => {
      const store = useFileSystemStore.getState()
      const node = store.getNodeByPath(path)
      if (!node) throw new Error(`File not found: ${path}`)
      return store.readFileContent(node.id)
    },
    writeFile: async (path: string, content: string): Promise<string> => {
      console.log(`[System.fs] writeFile: ${path}, length: ${content?.length}`);
      const store = useFileSystemStore.getState()
      const node = store.getNodeByPath(path)

      if (node) {
        store.updateFileContent(node.id, content)
        return node.id
      }

      const parts = path.split('/').filter(Boolean)
      const fileName = parts.pop()
      if (!fileName) throw new Error('Invalid path')

      const parentPath = '/' + parts.join('/')

      // Ensure parent directory exists (using createDirectory which has locking)
      const parentId = await System.fs.createDirectory(parentPath);
      const latestStore = useFileSystemStore.getState()
      const parentNode = latestStore.files[parentId];

      if (!parentNode || parentNode.type !== 'folder') {
        throw new Error(`Parent is not a directory: ${parentPath}`)
      }

      return latestStore.createItem(parentNode.id, fileName, 'file', content)
    },
    exists: (path: string) => !!useFileSystemStore.getState().getNodeByPath(path),
    readDir: (path: string) => {
      const store = useFileSystemStore.getState()
      const node = store.getNodeByPath(path)
      if (!node) throw new Error(`Directory not found: ${path}`)
      return store.getChildren(node.id)
    },
    createDirectory: async (path: string): Promise<string> => {
      const store = useFileSystemStore.getState()

      // 1. Normalization
      const parts = path.split('/').filter(Boolean)
      const normalizedPath = '/' + parts.join('/')

      // Root is special and skip locking
      if (normalizedPath === '/' || normalizedPath === '') return store.rootId

      // 2. Quick pre-check
      const existing = store.getNodeByPath(normalizedPath)
      if (existing) {
        if (existing.type === 'folder') return existing.id
        throw new Error(`Path exists but is not a directory: ${normalizedPath}`)
      }

      // 3. Lock this path to prevent concurrent creations
      const existingLock = pathLocks.get(normalizedPath)
      if (existingLock) return existingLock

      const createOp = (async () => {
        try {
          const name = parts[parts.length - 1]
          if (!name) return store.rootId

          const parentParts = parts.slice(0, -1)
          const parentPath = '/' + parentParts.join('/')

          // Recursive parent creation via locked createDirectory
          const parentId = await System.fs.createDirectory(parentPath)
          const latestStore = useFileSystemStore.getState()
          const parentNode = latestStore.files[parentId]

          if (!parentNode || parentNode.type !== 'folder') {
            throw new Error(`Parent directory missing for: ${normalizedPath}`)
          }

          // Final check after parent lock released
          const checkAgain = latestStore.getNodeByPath(normalizedPath)
          if (checkAgain) return checkAgain.id

          return await latestStore.createItem(parentNode.id, name, 'folder')
        } finally {
          // Cleanup lock after a short delay to allow store state to settle across events
          setTimeout(() => pathLocks.delete(normalizedPath), 100)
        }
      })()

      pathLocks.set(normalizedPath, createOp)
      return createOp
    }
  },
  process: {
    list: () => useProcessStore.getState().getProcessList(),
    launch: (appId: string, params?: any) => {
      const windowId = `${appId}-${uuidv4().slice(0, 8)}`
      useWindowStore.getState().launchApp(
        windowId,
        appId,
        appId, // Title (will be handled by registry)
        undefined, // Icon
        params
      )
      return windowId
    },
    kill: (pid: number) => useProcessStore.getState().killProcess(pid),
    killByWindowId: (windowId: string) => {
      const proc = useProcessStore.getState().getProcessByWindowId(windowId)
      if (proc) {
        useProcessStore.getState().killProcess(proc.pid)
      }
    }
  },
  settings: {
    setTheme: (mode: ThemeMode) => useSystemSettingsStore.getState().setTheme(mode),
    setWallpaper: (url: string) => useSystemSettingsStore.getState().setWallpaper({ type: 'image', value: url }),
    setVolume: (level: number) => useSystemSettingsStore.getState().setVolume(level),
    getSettings: () => useSystemSettingsStore.getState()
  },
  window: {
    close: (id: string) => useWindowStore.getState().closeWindow(id),
    minimize: (id: string) => useWindowStore.getState().minimizeWindow(id),
    maximize: (id: string) => useWindowStore.getState().maximizeWindow(id)
  }
}
