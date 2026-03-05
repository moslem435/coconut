import { create } from 'zustand'
import { WebContainer } from '@webcontainer/api'
import { SYSTEM_PATHS } from '@/os/config/paths'

interface WebContainerState {
  instance: WebContainer | null
  isBooting: boolean
  error: string | null

  boot: () => Promise<void>
  writeFile: (path: string, content: string | Uint8Array) => Promise<void>
  readFile: (path: string) => Promise<string>

  // New: Explicit Sync Methods for VFS
  syncFile: (path: string, content: string | Uint8Array) => Promise<void>
  syncMkdir: (path: string) => Promise<void>
  syncUnlink: (path: string) => Promise<void>
  isSyncingFromWC: boolean
  setSyncingFromWC: (val: boolean) => void

  // Execution
  runCommand: (cmd: string, args: string[], cwd?: string, onOutput?: (data: string) => void) => Promise<number>
}

let bootPromise: Promise<WebContainer> | null = null
let initializationPromise: Promise<void> | null = null
let globalWebContainerInstance: WebContainer | null = null

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
  instance: null,
  isBooting: false,
  error: null,
  isSyncingFromWC: false, // Internal flag exposed for VFS check
  setSyncingFromWC: (val) => set({ isSyncingFromWC: val }),

  // New: Explicit Sync Methods for VFS (Optimized)
  syncFile: async (path, content) => {
    const { instance, isSyncingFromWC } = get()
    if (!instance) return
    
    // If we are currently processing a change originating from WC, do not sync back to WC
    if (isSyncingFromWC) {
      // console.log('[VFS->WC] Skipped sync (loop prevention):', path)
      return
    }

    // Direct mapping: VFS path -> WC path (assuming path is absolute)
    // Only sync user files (/home/user/...) to WC root
    if (!path.startsWith(SYSTEM_PATHS.USER)) return
    
    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'
    
    try {
      // Ensure parent directory exists before writing file
      const parentPath = wcPath.split('/').slice(0, -1).join('/') || '/';
      if (parentPath !== '/') {
          await instance.fs.mkdir(parentPath, { recursive: true });
      }

      // console.log('[VFS->WC] writeFile:', wcPath)
      await instance.fs.writeFile(wcPath, content)
    } catch (e) {
      console.warn('[VFS->WC] writeFile failed:', e)
    }
  },

  syncMkdir: async (path) => {
    const { instance, isSyncingFromWC } = get()
    if (!instance) return

    if (isSyncingFromWC) {
       // console.log('[VFS->WC] Skipped mkdir (loop prevention):', path)
       return
    }

    // Only sync user files (/home/user/...) to WC root
    if (!path.startsWith(SYSTEM_PATHS.USER)) return
    
    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'

    try {
      // console.log('[VFS->WC] mkdir:', wcPath)
      await instance.fs.mkdir(wcPath, { recursive: true })
    } catch (e) {
      console.warn('[VFS->WC] mkdir failed:', e)
    }
  },

  syncUnlink: async (path) => {
    const { instance, isSyncingFromWC } = get()
    if (!instance || isSyncingFromWC) return

    // Only sync user files (/home/user/...) to WC root
    if (!path.startsWith(SYSTEM_PATHS.USER)) return
    
    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'

    try {
      console.log('[VFS->WC] unlink:', wcPath)
      await instance.fs.rm(wcPath, { recursive: true, force: true })
    } catch (e) {
      console.warn('[VFS->WC] unlink failed:', e)
    }
  },

  // Helper: Run command
  runCommand: async (cmd: string, args: string[], cwd: string = '/', onOutput?: (data: string) => void) => {
      const { instance } = get()
      if (!instance) throw new Error('WebContainer not booted')

      // Ensure cwd is relative to WC root
      let wcCwd = cwd;
      if (cwd.startsWith(SYSTEM_PATHS.USER)) {
          wcCwd = cwd.replace(SYSTEM_PATHS.USER, '') || '/';
      }

      console.log(`[WC] Spawning: ${cmd} ${args.join(' ')} in ${wcCwd}`)

      try {
          const process = await instance.spawn(cmd, args, {
              cwd: wcCwd,
              env: {
                  // Disable all interactive prompts
                  npm_config_yes: 'true',           // Auto-confirm npm prompts
                  CI: 'true',                        // CI mode - disable interactive
                  FORCE_COLOR: '0',                  // Disable color codes
                  NO_UPDATE_NOTIFIER: 'true',        // Disable update notifications
                  npm_config_audit: 'false',         // Skip audit
                  npm_config_fund: 'false',          // Skip funding messages
                  ADBLOCK: 'true',                   // Disable ads
                  DISABLE_OPENCOLLECTIVE: 'true',    // Disable opencollective
                  // Vite specific
                  VITE_CJS_IGNORE_WARNING: 'true',
                  // Suppress prompts
                  SHELL: '/bin/sh',
                  TERM: 'dumb'
              }
          })

          let streamPromise = Promise.resolve();
          let fullOutput = '';
          
          if (onOutput) {
              streamPromise = process.output.pipeTo(new WritableStream({
                  write(data) {
                      fullOutput += data;
                      onOutput(data);
                      
                      // Detect interactive prompts
                      const lowerOutput = fullOutput.toLowerCase();
                      if (
                          (lowerOutput.includes('? ') || lowerOutput.includes('(y/n)')) &&
                          (lowerOutput.includes('yes') || lowerOutput.includes('no'))
                      ) {
                          // Dispatch event for interactive prompt detection
                          window.dispatchEvent(new CustomEvent('webcontainer:interactive-prompt', {
                              detail: {
                                  cmd,
                                  output: fullOutput,
                                  process
                              }
                          }));
                      }
                  }
              }))
          }

          // Timeout promise (e.g. 5 minutes for install)
          const timeoutMs = 300000;
          const timeoutPromise = new Promise<number>((_, reject) => {
              setTimeout(() => {
                  process.kill();
                  reject(new Error(`Command timed out after ${timeoutMs}ms`));
              }, timeoutMs);
          });

          const exitCode = await Promise.race([process.exit, timeoutPromise]);
          
          // Wait for stream to finish flushing after process exits
          try {
              await Promise.all([streamPromise]);
          } catch (e) {
              // Ignore stream errors on close
          }

          if (exitCode !== 0) {
              throw new Error(`Command failed with exit code ${exitCode}`)
          }
          return exitCode
      } catch (e: any) {
           console.error(`[WC] Command error:`, e)
           throw e
      }
  },

  boot: async () => {
    const { instance, isBooting } = get()
    
    // If we already have an instance in the store, return it
    if (instance) return
    
    // If we have a global instance but not in the store, restore it
    if (globalWebContainerInstance) {
      set({ instance: globalWebContainerInstance })
      return
    }

    // If initialization is already in progress, wait for it
    if (initializationPromise) {
      return initializationPromise
    }

    // Start initialization process
    initializationPromise = (async () => {
      set({ isBooting: true, error: null })

      try {
        // Dynamically import to ensure we get the latest
        const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')

        if (!bootPromise) {
          bootPromise = WebContainer.boot()
        }
        
        let webcontainer;
        try {
          webcontainer = await bootPromise
          // Store the instance globally to prevent losing reference
          globalWebContainerInstance = webcontainer
        } catch (e: any) {
          // Handle "Only a single WebContainer instance can be booted"
          if (e.message && e.message.includes('Only a single WebContainer instance can be booted')) {
               console.warn('WebContainer already booted, checking for existing instance...');
               
               // If we have a global instance, use it
               if (globalWebContainerInstance) {
                 console.log('Found existing global WebContainer instance, reusing it');
                 set({ instance: globalWebContainerInstance, isBooting: false });
                 initializationPromise = null;
                 return;
               }
               
               // Reset the boot promise to allow retry
               bootPromise = null;
               initializationPromise = null;
               set({ isBooting: false });
               
               // If there's already an instance in the store, just return
               const currentInstance = get().instance;
               if (currentInstance) {
                 return;
               }
               
               // Last resort: ask user to refresh
               throw new Error('WebContainer session conflict. Please refresh the page to reset the environment.');
          }
          throw e;
        }

        // Mount a basic starter project
        // 1. Basic System Files
        const mountTree: any = {
          // System wide config (optional)
          'etc': {
            directory: {
              'motd': {
                file: {
                  contents: 'Welcome to System Runtime'
                }
              }
            }
          }
        }

        // 2. Sync VFS -> WebContainer Tree
        const { files, rootId, getNodeByPath, createItem, updateFileContent, deleteItem } = useFileSystemStore.getState()

        // Helper to build tree
        const buildTree = async (parentId: string): Promise<any> => {
          const children = Object.values(files).filter(f => f.parentId === parentId)
          const tree: any = {}

          for (const child of children) {
            if (child.type === 'folder') {
              tree[child.name] = {
                directory: await buildTree(child.id)
              }
            } else {
              try {
                const content = await useFileSystemStore.getState().readFileContent(child.id)
                tree[child.name] = {
                  file: {
                    contents: content
                  }
                }
              } catch (e) {
                console.warn(`Failed to read content for mount: ${child.name}`, e)
                tree[child.name] = {
                  file: {
                    contents: ''
                  }
                }
              }
            }
          }
          return tree
        }

        // Build the tree starting from user home and mount it under WC root (~/)
        // This maps VFS /home/user -> WC ~/
        const userNode = getNodeByPath(SYSTEM_PATHS.USER)
        let vfsTree = {}
        if (userNode) {
           vfsTree = await buildTree(userNode.id)
        } else {
           // Fallback if user node not found (should not happen)
           console.warn('User node not found, mounting root')
           vfsTree = await buildTree(rootId)
        }
        
        // Merge trees
        const finalTree = { ...mountTree, ...vfsTree }

        await webcontainer.mount(finalTree)

        // Ensure project directory exists (mapped to ~/project)
        const projectRelativePath = 'project' // SYSTEM_PATHS.PROJECT relative to /home/user
        try {
          await webcontainer.fs.mkdir(projectRelativePath, { recursive: true });
          
          // Write default project files if they don't exist
          await webcontainer.fs.writeFile(`${projectRelativePath}/package.json`, JSON.stringify({
            name: 'web-os-terminal',
            type: 'module',
            dependencies: {
              'express': 'latest',
              'nodemon': 'latest'
            },
            scripts: {
              'start': 'nodemon index.js'
            }
          }, null, 2));

          await webcontainer.fs.writeFile(`${projectRelativePath}/index.js`, `import express from 'express';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello from System Runtime!');
});

app.listen(port, () => {
  console.log(\`App running at http://localhost:\${port}\`);
});`);

        } catch (e) {
          console.warn('Failed to setup default project:', e)
        }

        // --- Bi-directional Sync Implementation ---

        // 3. WebContainer -> VFS (fs.watch)
        // Watch root to capture all changes
        webcontainer.fs.watch('/', { recursive: true }, async (event, filename) => {
          try {
              // Explicitly check if filename is string. fs.watch type definition might be loose.
              if (typeof filename !== 'string' || !filename) return

              // Ignore node_modules and hidden files/directories
              if (filename.includes('node_modules') || filename.includes('/.') || filename.startsWith('.')) return

              set({ isSyncingFromWC: true })

              // filename is relative to watched path ('/'), so "foo.txt" or "project/foo.txt"
              // We map WC root to /home/user, so prepend SYSTEM_PATHS.USER
              const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename
              const vfsPath = `${SYSTEM_PATHS.USER}/${cleanFilename}`

              // Check existence and type using readdir on parent to avoid 'stat' error
              const parentWcPath = `/${cleanFilename.split('/').slice(0, -1).join('/')}`
              const name = cleanFilename.split('/').pop()!

              let entry: { isDirectory: () => boolean; name: string } | undefined
              try {
                  // @ts-ignore - readdir with options is valid in WebContainer but types might be missing
                  const entries = await webcontainer.fs.readdir(parentWcPath, { withFileTypes: true })
                  entry = entries.find((e: any) => e.name === name)
              } catch (e) {
                  // Parent might not exist or other error
              }

              if (!entry) {
                  const node = useFileSystemStore.getState().getNodeByPath(vfsPath)
                  if (node) {
                  console.log('[WC->VFS] Deleting:', vfsPath)
                  await deleteItem(node.id)
                  }
              } else {
                  const parentPath = vfsPath.split('/').slice(0, -1).join('/')
                  const parentNode = useFileSystemStore.getState().getNodeByPath(parentPath)

                  if (!parentNode && parentPath !== '') return

                  const parentId = parentPath === '' ? rootId : parentNode?.id
                  if (!parentId) return

                  const existingNode = useFileSystemStore.getState().getNodeByPath(vfsPath)

                  if (entry.isDirectory()) {
                  if (!existingNode) {
                      console.log('[WC->VFS] Creating Folder:', vfsPath)
                      await createItem(parentId, name, 'folder')
                  }
                  } else {
                  const fullWcPath = filename.startsWith('/') ? filename : `/${filename}`
                  const content = await webcontainer.fs.readFile(fullWcPath, 'utf-8') as string

                  if (!existingNode) {
                      console.log('[WC->VFS] Creating File:', vfsPath)
                      await createItem(parentId, name, 'file', content)
                  } else {
                      const currentContent = await useFileSystemStore.getState().readFileContent(existingNode.id)
                      if (currentContent !== content) {
                      console.log('[WC->VFS] Updating File:', vfsPath)
                      await updateFileContent(existingNode.id, content)
                      }
                  }
                  }
              }
          } catch (e) {
              console.error('[WC->VFS] Sync Error:', e)
          } finally {
              setTimeout(() => set({ isSyncingFromWC: false }), 50)
          }
        })

        set({ instance: webcontainer, isBooting: false })
        globalWebContainerInstance = webcontainer
      } catch (err) {
        console.error('Failed to boot WebContainer:', err)
        set({
          error: err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? (err as any).message || JSON.stringify(err) : String(err)),
          isBooting: false
        })
        bootPromise = null // Reset on failure
        initializationPromise = null // Allow retry
        throw err
      }
    })(); // End of IIFE

    return initializationPromise
  },

  writeFile: async (path, content) => {
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
