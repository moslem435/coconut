import { create } from 'zustand'
import { WebContainer } from '@webcontainer/api'

interface WebContainerState {
  instance: WebContainer | null
  isBooting: boolean
  error: string | null
  
  boot: () => Promise<void>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  
  // New: Explicit Sync Methods for VFS
  syncFile: (path: string, content: string) => Promise<void>
  syncMkdir: (path: string) => Promise<void>
  syncUnlink: (path: string) => Promise<void>
  isSyncingFromWC: boolean
  setSyncingFromWC: (val: boolean) => void
}

let bootPromise: Promise<WebContainer> | null = null

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
  instance: null,
  isBooting: false,
  error: null,
  isSyncingFromWC: false, // Internal flag exposed for VFS check
  setSyncingFromWC: (val) => set({ isSyncingFromWC: val }),

  // New: Explicit Sync Methods for VFS (Optimized)
  syncFile: async (path, content) => {
      const { instance, isSyncingFromWC } = get()
      if (!instance || isSyncingFromWC) return
      
      const wcPath = `/home/guest${path}`
      try {
          console.log('[VFS->WC] writeFile:', wcPath)
          await instance.fs.writeFile(wcPath, content)
      } catch (e) {
          console.warn('[VFS->WC] writeFile failed:', e)
      }
  },

  syncMkdir: async (path) => {
      const { instance, isSyncingFromWC } = get()
      if (!instance || isSyncingFromWC) return

      const wcPath = `/home/guest${path}`
      try {
          console.log('[VFS->WC] mkdir:', wcPath)
          await instance.fs.mkdir(wcPath, { recursive: true })
      } catch (e) {
          console.warn('[VFS->WC] mkdir failed:', e)
      }
  },

  syncUnlink: async (path) => {
      const { instance, isSyncingFromWC } = get()
      if (!instance || isSyncingFromWC) return

      const wcPath = `/home/guest${path}`
      try {
          console.log('[VFS->WC] unlink:', wcPath)
          // Try to determine if file or folder, but rm -r works for both mostly if we use custom logic
          // WebContainer rm is strictly file or directory?
          // rm(path, { recursive: true }) handles both
          await instance.fs.rm(wcPath, { recursive: true, force: true })
      } catch (e) {
          console.warn('[VFS->WC] unlink failed:', e)
      }
  },

  boot: async () => {
    const { instance, isBooting } = get()
    if (instance) return
    if (isBooting) return

    set({ isBooting: true, error: null })

    // Dynamically import to ensure we get the latest
    const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')

    try {
      if (!bootPromise) {
        bootPromise = WebContainer.boot()
      }
      const webcontainer = await bootPromise
      
      // Mount a basic starter project
      // 1. Basic System Files & Project Structure
      const mountTree: any = {
        'home': {
          directory: {
            'guest': {
              directory: {
                // Project folder for Node.js stuff
                'project': {
                  directory: {
                    'package.json': {
                      file: {
                        contents: JSON.stringify({
                          name: 'web-os-terminal',
                          type: 'module',
                          dependencies: {
                            'express': 'latest',
                            'nodemon': 'latest'
                          },
                          scripts: {
                            'start': 'nodemon index.js'
                          }
                        }, null, 2)
                      }
                    },
                    'index.js': {
                      file: {
                        contents: `import express from 'express';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello from WebContainer OS!');
});

app.listen(port, () => {
  console.log(\`App running at http://localhost:\${port}\`);
});`
                      }
                    }
                  }
                },
                // VFS Content will be mounted here dynamically
                // We reserve keys for VFS content to be merged here
              }
            }
          }
        },
        // System wide config (optional)
        'etc': {
            directory: {
                'motd': {
                    file: {
                        contents: 'Welcome to Portfolio OS (WebContainer Edition)'
                    }
                }
            }
        }
      }

      // 2. Sync VFS -> WebContainer Tree
      const { files, rootId, getNodeByPath, createItem, updateFileContent, deleteItem } = useFileSystemStore.getState()
      
      // Helper to build tree
      const buildTree = (parentId: string): any => {
          const children = Object.values(files).filter(f => f.parentId === parentId)
          const tree: any = {}
          
          children.forEach(child => {
              if (child.type === 'folder') {
                  tree[child.name] = {
                      directory: buildTree(child.id)
                  }
              } else {
                  tree[child.name] = {
                      file: {
                          contents: child.content || ''
                      }
                  }
              }
          })
          return tree
      }

      // Build the tree starting from root and mount it under '/home/guest'
      // Merge VFS tree into the guest directory
      const vfsTree = buildTree(rootId)
      Object.assign(mountTree['home'].directory['guest'].directory, vfsTree)

      await webcontainer.mount(mountTree)

      // --- Bi-directional Sync Implementation ---

      // 3. WebContainer -> VFS (fs.watch)
      webcontainer.fs.watch('/home/guest', { recursive: true }, async (event, filename) => {
          // If we are currently syncing FROM VFS, ignore this echo
          // Note: We don't have isSyncingFromVFS flag in store, but we can assume
          // if we just called a sync method, WC will emit event.
          // However, for simplicity, we rely on content check to break loop.
          
          if (!filename) return
          if (filename.startsWith('project/')) return

          set({ isSyncingFromWC: true }) // Set flag so VFS knows not to echo back

          try {
              const vfsPath = filename
              const fullWcPath = `/home/guest/${filename}`
              
              let exists = false
              let stat
              try {
                  stat = await webcontainer.fs.stat(fullWcPath)
                  exists = true
              } catch (e) {
                  exists = false
              }

              if (!exists) {
                  const node = useFileSystemStore.getState().getNodeByPath(vfsPath)
                  if (node) {
                      console.log('[WC->VFS] Deleting:', vfsPath)
                      await deleteItem(node.id)
                  }
              } else {
                  const parentPath = vfsPath.split('/').slice(0, -1).join('/')
                  const name = vfsPath.split('/').pop()!
                  
                  const parentNode = useFileSystemStore.getState().getNodeByPath(parentPath)
                  if (!parentNode) {
                       // Handle root children if parentPath is empty
                       if (parentPath !== '') return
                  }

                  const parentId = parentPath === '' ? rootId : parentNode?.id
                  if (!parentId) return

                  const existingNode = useFileSystemStore.getState().getNodeByPath(vfsPath)

                  if (stat?.isDirectory()) {
                      if (!existingNode) {
                          console.log('[WC->VFS] Creating Folder:', vfsPath)
                          await createItem(parentId, name, 'folder')
                      }
                  } else {
                      const content = await webcontainer.fs.readFile(fullWcPath, 'utf-8')
                      if (!existingNode) {
                          console.log('[WC->VFS] Creating File:', vfsPath)
                          await createItem(parentId, name, 'file', content)
                      } else {
                          if (existingNode.content !== content) {
                              console.log('[WC->VFS] Updating File:', vfsPath)
                              await updateFileContent(existingNode.id, content)
                          }
                      }
                  }
              }
          } catch (e) {
              console.error('[WC->VFS] Sync Error:', e)
          } finally {
              // Small delay to ensure VFS updates have processed before releasing lock
              setTimeout(() => set({ isSyncingFromWC: false }), 50)
          }
      })

      set({ instance: webcontainer, isBooting: false })
    } catch (err) {
      console.error('Failed to boot WebContainer:', err)
      set({ 
        error: err instanceof Error ? err.message : 'Failed to boot WebContainer', 
        isBooting: false 
      })
      bootPromise = null // Reset on failure
    }
  },

  writeFile: async (path: string, content: string) => {
    const { instance } = get()
    if (!instance) throw new Error('WebContainer not booted')
    await instance.fs.writeFile(path, content)
  },

  readFile: async (path: string) => {
    const { instance } = get()
    if (!instance) throw new Error('WebContainer not booted')
    const uint8 = await instance.fs.readFile(path)
    return new TextDecoder().decode(uint8)
  }
}))
