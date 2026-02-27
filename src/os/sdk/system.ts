import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useSystemSettingsStore, ThemeMode } from '@/os/kernel/useSystemSettingsStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { v4 as uuidv4 } from 'uuid'

export const System = {
  fs: {
    readFile: async (path: string) => {
      const store = useFileSystemStore.getState()
      const node = store.getNodeByPath(path)
      if (!node) throw new Error(`File not found: ${path}`)
      return store.readFileContent(node.id)
    },
    writeFile: async (path: string, content: string) => {
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
      const parentNode = store.getNodeByPath(parentPath)
      
      if (!parentNode) {
        throw new Error(`Parent directory not found: ${parentPath}`)
      }

      if (parentNode.type !== 'folder') {
        throw new Error(`Parent is not a directory: ${parentPath}`)
      }

      return store.createItem(parentNode.id, fileName, 'file', content)
    },
    exists: (path: string) => !!useFileSystemStore.getState().getNodeByPath(path),
    readDir: (path: string) => {
       const store = useFileSystemStore.getState()
       const node = store.getNodeByPath(path)
       if (!node) throw new Error(`Directory not found: ${path}`)
       return store.getChildren(node.id)
    },
    createDirectory: async (path: string) => {
      const store = useFileSystemStore.getState()
      const node = store.getNodeByPath(path)
      if (node) {
        if (node.type === 'folder') return node.id
        throw new Error(`Path exists but is not a directory: ${path}`)
      }
  
      const parts = path.split('/').filter(Boolean)
      const dirName = parts.pop()
      if (!dirName) throw new Error('Invalid path')
  
      const parentPath = '/' + parts.join('/')
      const parentNode = store.getNodeByPath(parentPath)
      
      if (!parentNode) {
        throw new Error(`Parent directory not found: ${parentPath}`)
      }
  
      return store.createItem(parentNode.id, dirName, 'folder')
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
