import { create } from 'zustand'
import { WebContainer } from '@webcontainer/api'
import { SYSTEM_PATHS } from '@/os/config/paths'
import { toast } from '@/os/components/Toast'

interface SyncQueueItem {
  type: 'mkdir' | 'file' | 'unlink'
  path: string
  content?: string | Uint8Array
}

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
  syncWCToVFS: (wcPath: string) => Promise<void> // Manual sync from WebContainer to VFS
  isSyncingFromWC: boolean
  setSyncingFromWC: (val: boolean) => void

  // Execution
  runCommand: (cmd: string, args: string[], cwd?: string, onOutput?: (data: string) => void, options?: { detached?: boolean, successPattern?: string }) => Promise<number>
}

let bootPromise: Promise<WebContainer> | null = null
let initializationPromise: Promise<void> | null = null
let globalWebContainerInstance: WebContainer | null = null
let syncQueue: SyncQueueItem[] = []

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
  instance: null,
  isBooting: false,
  error: null,
  isSyncingFromWC: false, // Internal flag exposed for VFS check
  setSyncingFromWC: (val) => set({ isSyncingFromWC: val }),

  // New: Explicit Sync Methods for VFS (Optimized)
  syncFile: async (path, content) => {
    const { instance, isSyncingFromWC } = get()

    // If we are currently processing a change originating from WC, do not sync back to WC
    if (isSyncingFromWC) {
      return
    }

    // Ensure we only sync paths within the user home directory
    if (!path.startsWith(SYSTEM_PATHS.USER)) {
      // console.warn(`[VFS->WC] Skipping sync for path outside user home: ${path}. WebContainer only mounts ${SYSTEM_PATHS.USER}`);
      return
    }

    // If no instance, queue the operation
    if (!instance) {
      const contentLen = typeof content === 'string' ? content.length : content?.byteLength || 0
      // console.log(`[VFS->WC] Queueing file sync (no instance yet): ${path}, content: ${contentLen} bytes`)
      syncQueue.push({ type: 'file', path, content })
      return
    }

    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'

    try {
      // Ensure parent directory exists before writing file
      const parentPath = wcPath.split('/').slice(0, -1).join('/') || '/';
      if (parentPath !== '/' && parentPath !== '') {
        await instance.fs.mkdir(parentPath, { recursive: true });
      }

      await instance.fs.writeFile(wcPath, content)
      // console.log('[VFS->WC] ✅ File synced:', wcPath)
    } catch (e) {
      console.warn('[VFS->WC] writeFile failed:', e)
    }
  },

  syncMkdir: async (path) => {
    const { instance, isSyncingFromWC } = get()

    if (isSyncingFromWC) {
      return
    }

    if (!path.startsWith(SYSTEM_PATHS.USER)) {
      // console.warn(`[VFS->WC] Skipping mkdir for path outside user home: ${path}`);
      return
    }

    // If no instance, queue the operation
    if (!instance) {
      // console.log('[VFS->WC] Queueing mkdir (no instance yet):', path)
      syncQueue.push({ type: 'mkdir', path })
      return
    }

    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'
    // console.log('[VFS->WC] Creating directory:', wcPath)
    try {
      await instance.fs.mkdir(wcPath, { recursive: true })
      // console.log('[VFS->WC] ✅ Directory created:', wcPath)
    } catch (e) {
      console.warn('[VFS->WC] mkdir failed:', wcPath, e)
    }
  },

  syncUnlink: async (path) => {
    const { instance, isSyncingFromWC } = get()

    if (isSyncingFromWC) {
      return
    }

    if (!path.startsWith(SYSTEM_PATHS.USER)) {
      // console.warn(`[VFS->WC] Skipping unlink for path outside user home: ${path}`);
      return
    }

    // If no instance, queue the operation
    if (!instance) {
      // console.log('[VFS->WC] Queueing unlink (no instance yet):', path)
      syncQueue.push({ type: 'unlink', path })
      return
    }

    const wcPath = path.replace(SYSTEM_PATHS.USER, '') || '/'
    try {
      await instance.fs.rm(wcPath, { recursive: true });
      // console.log('[VFS->WC] ✅ Deleted:', wcPath)
    } catch (e) {
      // Ignore if already deleted
    }
  },

  // Manual sync from WebContainer to VFS
  syncWCToVFS: async (wcPath: string = '/') => {
    const { instance, isSyncingFromWC } = get()
    if (!instance) {
      console.warn('[WC->VFS] Cannot sync: WebContainer not booted')
      return
    }

    // Set syncing flag to prevent circular sync
    set({ isSyncingFromWC: true })

    try {
      const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')
      const { getNodeByPath, createItem, updateFileContent } = useFileSystemStore.getState()

      console.log(`[WC->VFS] Starting manual sync from WC:${wcPath}`)

      let syncedFiles = 0
      let syncedFolders = 0
      const createdPaths: string[] = []

      // --- Phase 4 Restore Logic: Check for snapshots in current dir ---
      // If we are syncing a folder that contains a node_modules.tar snapshot in OPFS,
      // we should restore it to WebContainer!
      // NOTE: We don't have easy access to "current OPFS state" here without async calls.
      // But we can blindly try to restore if we see a node_modules folder is missing but tar exists?
      // Actually, better place for restore is during directory traversal or explicit app launch.
      // For now, let's just allow .tar files to sync back to VFS so they are visible.

      const syncDirectory = async (wcDir: string, vfsPath: string) => {
        try {
          // console.log(`[WC->VFS] Syncing directory WC:${wcDir} -> VFS:${vfsPath}`)
          const entries = await instance.fs.readdir(wcDir, { withFileTypes: true }) as any[]

          for (const entry of entries) {
            // Skip hidden files and node_modules FOLDER
            // BUT allow node_modules.tar file!
            if (entry.name.startsWith('.')) continue;
            if (entry.name === 'node_modules') continue; 

            const wcItemPath = wcDir === '/' ? `/${entry.name}` : `${wcDir}/${entry.name}`
            const vfsItemPath = `${vfsPath}/${entry.name}`

            if (entry.isDirectory()) {
              // Check if folder exists in VFS
              let folderNode = getNodeByPath(vfsItemPath)
              if (!folderNode) {
                // Create folder
                const parentNode = getNodeByPath(vfsPath)
                if (parentNode) {
                  // console.log(`[WC->VFS] Creating folder: ${vfsItemPath}`)
                  await createItem(parentNode.id, entry.name, 'folder', undefined, undefined, { source: 'wc' })
                  syncedFolders++
                  createdPaths.push(vfsItemPath)
                  // Wait for state update
                  await new Promise(r => setTimeout(r, 50))
                } else {
                  console.warn(`[WC->VFS] Parent not found for folder: ${vfsPath}`)
                }
              }
              // Recursively sync subdirectory
              await syncDirectory(wcItemPath, vfsItemPath)
            } else {
              // Sync file
              const content = await instance.fs.readFile(wcItemPath, 'utf-8') as string
              const fileNode = getNodeByPath(vfsItemPath)

              if (!fileNode) {
                // Create file
                const parentNode = getNodeByPath(vfsPath)
                if (parentNode) {
                  // console.log(`[WC->VFS] Creating file: ${vfsItemPath} (${content.length} bytes)`)
                  await createItem(parentNode.id, entry.name, 'file', content, undefined, { source: 'wc' })
                  syncedFiles++
                  createdPaths.push(vfsItemPath)
                  // Small delay to allow state propagation
                  await new Promise(r => setTimeout(r, 30))
                } else {
                  console.warn(`[WC->VFS] Parent not found for file: ${vfsPath}`)
                }
              } else {
                // Update file if content changed
                const currentContent = await useFileSystemStore.getState().readFileContent(fileNode.id)
                if (currentContent !== content) {
                  // console.log(`[WC->VFS] Updating file: ${vfsItemPath} (${content.length} bytes)`)
                  await updateFileContent(fileNode.id, content, { source: 'wc' })
                  syncedFiles++
                  createdPaths.push(vfsItemPath)
                }
              }
            }
          }
        } catch (e) {
          console.warn(`[WC->VFS] Failed to sync directory ${wcDir}:`, e)
        }
      }

      // Convert WC path to VFS path
      // WC: /apps/intro-page -> VFS: /home/user/apps/intro-page
      const vfsBasePath = `${SYSTEM_PATHS.USER}${wcPath === '/' ? '' : wcPath}`

      console.log(`[WC->VFS] Mapping WC:${wcPath} -> VFS:${vfsBasePath}`)

      // Ensure the base path exists in VFS
      const baseNode = getNodeByPath(vfsBasePath)
      if (!baseNode) {
        console.warn(`[WC->VFS] Base path does not exist in VFS: ${vfsBasePath}`)
        console.warn(`[WC->VFS] Will try to sync from root instead`)
        // Fallback to syncing from root
        await syncDirectory('/', SYSTEM_PATHS.USER)
      } else {
        await syncDirectory(wcPath, vfsBasePath)
      }

      console.log(`[WC->VFS] ✅ Manual sync complete: ${syncedFolders} folders, ${syncedFiles} files`)

      // CRITICAL: Wait for all files to be synced to OPFS
      // The syncMiddleware processes events asynchronously
      // We need to wait a bit to ensure all files are written to OPFS
      if (createdPaths.length > 0) {
        console.log(`[WC->VFS] Waiting for OPFS sync to complete (${createdPaths.length} items)...`)
        // Wait 2 seconds for OPFS sync to complete
        await new Promise(r => setTimeout(r, 2000))
        console.log(`[WC->VFS] ✅ OPFS sync should be complete`)
      }
    } finally {
      // Reset sync flag
      set({ isSyncingFromWC: false })
    }
  },

  // Helper: Run command
  runCommand: async (cmd: string, args: string[], cwd: string = '/', onOutput?: (data: string) => void, options: { detached?: boolean, successPattern?: string } = {}) => {
    const { instance } = get()
    if (!instance) throw new Error('WebContainer not booted')

    // Ensure cwd is relative to WC root
    let wcCwd = cwd;
    if (cwd.startsWith(SYSTEM_PATHS.USER)) {
      wcCwd = cwd.replace(SYSTEM_PATHS.USER, '') || '/';
    }

    console.log(`[WC] Spawning: ${cmd} ${args.join(' ')} in ${wcCwd} (detached: ${options.detached})`)

    try {
      const process = await instance.spawn(cmd, args, {
        cwd: wcCwd,
        env: {
          npm_config_yes: 'true', // Auto-confirm npx prompts
          TERM: 'dumb' // Dumb terminal to avoid escape codes, though some tools ignore this
        }
      })

      // Expose stdin writer for interactive commands
      const writer = process.input.getWriter();

      // Listen for interactive input events from UI
      const inputHandler = (e: CustomEvent) => {
        if (e.detail?.cmd === cmd) {
          writer.write(e.detail.input);
        }
      };
      window.addEventListener('webcontainer:input', inputHandler as EventListener);

      // If detached mode, we resolve early once we see success pattern or after a short delay
      // We DO NOT await process.exit
      let resolved = false;
      let outputBuffer = '';
      const successPattern = options.successPattern || 'Local:'; // Default Vite pattern

      let streamPromise = Promise.resolve();

      if (onOutput || options.detached) {
        streamPromise = process.output.pipeTo(new WritableStream({
          write(data) {
            if (onOutput) onOutput(data);

            if (options.detached && !resolved) {
              outputBuffer += data;
              if (outputBuffer.includes(successPattern)) {
                resolved = true;
                // Resolve promise early for detached process
                // We keep the process running in background
              }
            }
          }
        }))
      }

      if (options.detached) {
        // Wait for success pattern or timeout
        const checkInterval = 100;
        const maxWait = 60000; // 60s timeout for server start
        let elapsed = 0;

        while (!resolved && elapsed < maxWait) {
          await new Promise(r => setTimeout(r, checkInterval));
          elapsed += checkInterval;
        }

        window.removeEventListener('webcontainer:input', inputHandler as EventListener);
        writer.releaseLock();

        if (!resolved) {
          // If timed out waiting for success pattern, we still return success but warn
          // The process is still running.
          return 0;
        }
        return 0; // Success start
      }

      // Standard blocking mode
      // Timeout promise (e.g. 5 minutes for install)
      const timeoutMs = 300000;
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => {
          process.kill();
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const exitCode = await Promise.race([process.exit, timeoutPromise]);

      // Cleanup
      window.removeEventListener('webcontainer:input', inputHandler as EventListener);
      writer.releaseLock();

      // Wait for stream to finish flushing after process exits
      try {
        await Promise.all([streamPromise]);
      } catch (e) {
        // Ignore stream errors on close
      }

      // --- Phase 4: Persistence Optimization (Snapshotting) ---
      // If this was a successful 'npm install', we should snapshot node_modules
      if (exitCode === 0 && cmd === 'npm' && args.includes('install')) {
         console.log('[WC] npm install success! Triggering node_modules snapshot...');
         try {
             // 1. Create tarball of node_modules inside WebContainer
             // Note: 'tar' is available in WebContainer environment
             // We use -cf (create file)
             const tarProcess = await instance.spawn('tar', ['-cf', 'node_modules.tar', 'node_modules'], { cwd: wcCwd });
             await tarProcess.exit;
             
             // 2. Read the tarball buffer
             // We read it as binary
             const tarBuffer = await instance.fs.readFile(`${wcCwd}/node_modules.tar`);
             
             // 3. Write directly to OPFS (Persistent Storage)
             // We bypass the VFS store state to avoid clogging Zustand with a large binary file
             // We use the raw 'fs' client which writes to OPFS
             const { fs } = await import('@/os/kernel/filesystem/FileSystemClient');
             
             // Construct absolute path for OPFS
             const opfsPath = cwd.endsWith('/') ? `${cwd}node_modules.tar` : `${cwd}/node_modules.tar`;
             
             console.log(`[Persistence] Saving snapshot to OPFS: ${opfsPath} (${tarBuffer.byteLength} bytes)`);
             await fs.writeFile(opfsPath, tarBuffer);
             
             // 4. Cleanup tarball from WebContainer to save memory
             await instance.fs.rm(`${wcCwd}/node_modules.tar`);
             
             console.log('[Persistence] Snapshot complete!');
         } catch (e) {
             console.warn('[Persistence] Snapshot failed:', e);
         }
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

    // If we already have an instance in the store, check if there are queued operations
    if (instance) {
      console.log('[Boot] Instance already exists, checking for queued operations...')

      // Process any queued sync operations
      if (syncQueue.length > 0) {
        console.log(`[Boot] 🔄 Processing ${syncQueue.length} queued operations from existing instance...`)
        const queuedOps = [...syncQueue]
        syncQueue = [] // Clear queue

        for (const op of queuedOps) {
          try {
            const wcPath = op.path.replace(SYSTEM_PATHS.USER, '') || '/'

            if (op.type === 'mkdir') {
              await instance.fs.mkdir(wcPath, { recursive: true })
              console.log(`[Boot] ✅ Queued mkdir: ${wcPath}`)
            } else if (op.type === 'file') {
              const parentPath = wcPath.split('/').slice(0, -1).join('/') || '/'
              if (parentPath !== '/' && parentPath !== '') {
                await instance.fs.mkdir(parentPath, { recursive: true })
              }

              const contentLength = typeof op.content === 'string' ? op.content.length : op.content?.byteLength || 0
              const hasContent = op.content !== undefined && op.content !== null
              console.log(`[Boot] 📝 Processing queued file: ${wcPath}, hasContent: ${hasContent}, length: ${contentLength} bytes`)

              if (op.content === undefined || op.content === null) {
                const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')
                const node = useFileSystemStore.getState().getNodeByPath(op.path)
                if (node) {
                  const content = await useFileSystemStore.getState().readFileContent(node.id)
                  await instance.fs.writeFile(wcPath, content)
                  console.log(`[Boot] ✅ Queued file (from VFS): ${wcPath} (${content.length} bytes)`)
                } else {
                  await instance.fs.writeFile(wcPath, '')
                }
              } else {
                await instance.fs.writeFile(wcPath, op.content)
                console.log(`[Boot] ✅ Queued file written: ${wcPath} (${contentLength} bytes)`)
              }
            } else if (op.type === 'unlink') {
              await instance.fs.rm(wcPath, { recursive: true })
              console.log(`[Boot] ✅ Queued unlink: ${wcPath}`)
            }
          } catch (e) {
            console.warn(`[Boot] ⚠️ Failed to process queued operation:`, op, e)
          }
        }

        console.log(`[Boot] ✅ Processed ${queuedOps.length} queued operations`)
      }

      return
    }

    // If we have a global instance but not in the store, restore it
    if (globalWebContainerInstance) {
      console.log('[Boot] Restoring global WebContainer instance...')
      set({ instance: globalWebContainerInstance })

      // Process any queued sync operations
      if (syncQueue.length > 0) {
        console.log(`[Boot] 🔄 Processing ${syncQueue.length} queued operations after restore...`)
        const queuedOps = [...syncQueue]
        syncQueue = [] // Clear queue

        for (const op of queuedOps) {
          try {
            const wcPath = op.path.replace(SYSTEM_PATHS.USER, '') || '/'

            if (op.type === 'mkdir') {
              await globalWebContainerInstance.fs.mkdir(wcPath, { recursive: true })
              console.log(`[Boot] ✅ Queued mkdir: ${wcPath}`)
            } else if (op.type === 'file') {
              const parentPath = wcPath.split('/').slice(0, -1).join('/') || '/'
              if (parentPath !== '/' && parentPath !== '') {
                await globalWebContainerInstance.fs.mkdir(parentPath, { recursive: true })
              }

              const contentLength = typeof op.content === 'string' ? op.content.length : op.content?.byteLength || 0
              const hasContent = op.content !== undefined && op.content !== null
              console.log(`[Boot] 📝 Processing queued file: ${wcPath}, hasContent: ${hasContent}, length: ${contentLength} bytes`)

              if (op.content === undefined || op.content === null) {
                const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')
                const node = useFileSystemStore.getState().getNodeByPath(op.path)
                if (node) {
                  const content = await useFileSystemStore.getState().readFileContent(node.id)
                  await globalWebContainerInstance.fs.writeFile(wcPath, content)
                  console.log(`[Boot] ✅ Queued file (from VFS): ${wcPath} (${content.length} bytes)`)
                } else {
                  await globalWebContainerInstance.fs.writeFile(wcPath, '')
                }
              } else {
                await globalWebContainerInstance.fs.writeFile(wcPath, op.content)
                console.log(`[Boot] ✅ Queued file written: ${wcPath} (${contentLength} bytes)`)
              }
            } else if (op.type === 'unlink') {
              await globalWebContainerInstance.fs.rm(wcPath, { recursive: true })
              console.log(`[Boot] ✅ Queued unlink: ${wcPath}`)
            }
          } catch (e) {
            console.warn(`[Boot] ⚠️ Failed to process queued operation:`, op, e)
          }
        }

        console.log(`[Boot] ✅ Processed ${queuedOps.length} queued operations`)
      }

      return
    }

    // If initialization is already in progress, wait for it
    if (initializationPromise) {
      return initializationPromise
    }

    // Start initialization process
    initializationPromise = (async () => {
      set({ isBooting: true, error: null, isSyncingFromWC: true }) // Lock sync during boot

      try {
        // Dynamically import to ensure we get the latest
        const { useFileSystemStore } = await import('@/os/kernel/useFileSystemStore')

        // Wait for VFS hydration to complete
        // This ensures we mount the full persisted file tree, not just the initial state
        await useFileSystemStore.getState().waitForHydration()

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

        // --- Phase 4 Restore Logic: Check for tarball snapshots ---
        // Before we boot or mount, let's scan VFS for any .tar files that might be backups
        // and add them to our restoration queue.
        // Actually, we can just do this AFTER boot by running tar -xf.
        
        // Helper to convert VFS tree to WebContainer mount tree
        const buildMountTree = async (nodeId: string): Promise<any> => {
          const node = files[nodeId]
          if (!node) return null

          if (node.type === 'file') {
            // Read content from VFS (which reads from OPFS/IndexedDB)
            try {
              const content = await useFileSystemStore.getState().readFileContent(node.id)
              // Handle binary content if needed, but MountTree expects string or Uint8Array
              return {
                file: {
                  contents: content
                }
              }
            } catch (e) {
              console.warn(`Failed to read file for mount: ${node.name}`, e)
              return null
            }
          } else {
            // Directory
            const children = useFileSystemStore.getState().getChildren(node.id)
            const dirContent: any = {}
            
            for (const child of children) {
              // Skip node_modules folder (it's too big and should be restored via tarball)
              if (child.name === 'node_modules') continue;
              
              const childTree = await buildMountTree(child.id)
              if (childTree) {
                dirContent[child.name] = childTree
              }
            }
            
            return {
              directory: dirContent
            }
          }
        }

        // Get User Home tree
        const userNode = getNodeByPath(SYSTEM_PATHS.USER)
        if (userNode) {
          const userTree = await buildMountTree(userNode.id)
          if (userTree && userTree.directory) {
            // Merge into root mount tree
            // Since we mount to root, we need to ensure structure matches
            // WebContainer root is effectively our SYSTEM_PATHS.USER
            Object.assign(mountTree, userTree.directory)
          }
        }

        // Boot with mounted file system
        // console.log('[WC] Booting with mount tree:', Object.keys(mountTree))
        await webcontainer.mount(mountTree)
        
        // --- Phase 4 Restore Logic: Restore snapshots ---
        // After mount, scan for node_modules.tar files and extract them
        const restoreSnapshots = async (dirPath: string) => {
             try {
                 const entries = await webcontainer.fs.readdir(dirPath, { withFileTypes: true });
                 for (const entry of entries) {
                     if (entry.isDirectory()) {
                         await restoreSnapshots(dirPath === '/' ? entry.name : `${dirPath}/${entry.name}`);
                     } else if (entry.name === 'node_modules.tar') {
                         const fullPath = dirPath === '/' ? entry.name : `${dirPath}/${entry.name}`;
                         const targetDir = dirPath === '/' ? '.' : dirPath;
                         console.log(`[Persistence] Found snapshot at ${fullPath}, restoring...`);
                         try {
                             await webcontainer.spawn('tar', ['-xf', 'node_modules.tar'], { cwd: targetDir });
                             console.log(`[Persistence] Restored node_modules in ${targetDir}`);
                         } catch (e) {
                             console.warn(`[Persistence] Failed to restore snapshot ${fullPath}:`, e);
                         }
                     }
                 }
             } catch (e) {
                 // ignore errors
             }
        };
        
        // Start restoration in background
        restoreSnapshots('/').catch(e => console.warn('Snapshot restore error:', e));

        console.log('[Boot] ✅ Mount complete')

        // Skip the comprehensive sync - mount already handles this
        // The file watcher will handle any future changes
        console.log('[Boot] Skipping post-mount sync (mount already synced everything)')

        // Sync initial mount files back to VFS (so they show up in File Explorer)
        try {
          const userNode = getNodeByPath(SYSTEM_PATHS.USER);
          if (userNode) {
            let etcNode = getNodeByPath(`${SYSTEM_PATHS.USER}/etc`);
            if (!etcNode) {
              await createItem(userNode.id, 'etc', 'folder', undefined, undefined, { source: 'wc' });
              etcNode = getNodeByPath(`${SYSTEM_PATHS.USER}/etc`);
            }
            if (etcNode) {
              const motdNode = getNodeByPath(`${SYSTEM_PATHS.USER}/etc/motd`);
              if (!motdNode) {
                await createItem(etcNode.id, 'motd', 'file', 'Welcome to System Runtime', undefined, { source: 'wc' });
              }
            }
          }
        } catch (e) {
          console.warn('Failed to sync mount files to VFS:', e);
        }

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

          // Sync default project to VFS
          // Re-fetch store methods to ensure fresh state
          const fsStore = useFileSystemStore.getState();
          const getNode = fsStore.getNodeByPath;
          const create = fsStore.createItem;

          const userNode = getNode(SYSTEM_PATHS.USER);
          if (userNode) {
            let projectNode = getNode(`${SYSTEM_PATHS.USER}/${projectRelativePath}`);
            if (!projectNode) {
              // Force sync wait to avoid race condition
              await create(userNode.id, projectRelativePath, 'folder', undefined, undefined, { source: 'wc' });
              // Add small delay for state update propagation
              await new Promise(r => setTimeout(r, 50));
              projectNode = getNode(`${SYSTEM_PATHS.USER}/${projectRelativePath}`);
            }
            if (projectNode) {
              // Sync package.json
              if (!getNode(`${SYSTEM_PATHS.USER}/${projectRelativePath}/package.json`)) {
                await create(projectNode.id, 'package.json', 'file', JSON.stringify({
                  name: 'web-os-terminal',
                  type: 'module',
                  dependencies: {
                    'express': 'latest',
                    'nodemon': 'latest'
                  },
                  scripts: {
                    'start': 'nodemon index.js'
                  }
                }, null, 2), undefined, { source: 'wc' });
              }
              // Sync index.js
              if (!getNode(`${SYSTEM_PATHS.USER}/${projectRelativePath}/index.js`)) {
                await create(projectNode.id, 'index.js', 'file', `import express from 'express';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
res.send('Hello from System Runtime!');
});

app.listen(port, () => {
console.log(\`App running at http://localhost:\${port}\`);
});`, undefined, { source: 'wc' });
              }
            }
          }

        } catch (e) {
          console.warn('Failed to setup default project:', e)
        } finally {
          // Release sync lock BEFORE processing queue
          set({ isSyncingFromWC: false })
        }

        // Set instance and isBooting BEFORE processing queue
        // This allows queued operations to execute immediately
        set({ instance: webcontainer, isBooting: false })
        globalWebContainerInstance = webcontainer

        // Process queued sync operations
        console.log(`[Boot] 🔄 Processing ${syncQueue.length} queued sync operations...`)
        if (syncQueue.length > 0) {
          const queuedOps = [...syncQueue]
          syncQueue = [] // Clear queue

          let processed = 0
          for (const op of queuedOps) {
            try {
              const wcPath = op.path.replace(SYSTEM_PATHS.USER, '') || '/'

              if (op.type === 'mkdir') {
                await webcontainer.fs.mkdir(wcPath, { recursive: true })
                console.log(`[Boot] ✅ Queued mkdir: ${wcPath}`)
                processed++
              } else if (op.type === 'file') {
                // Ensure parent exists
                const parentPath = wcPath.split('/').slice(0, -1).join('/') || '/'
                if (parentPath !== '/' && parentPath !== '') {
                  await webcontainer.fs.mkdir(parentPath, { recursive: true })
                }

                // Debug: log content info
                const contentLength = typeof op.content === 'string' ? op.content.length : op.content?.byteLength || 0
                const hasContent = op.content !== undefined && op.content !== null
                console.log(`[Boot] 📝 Processing queued file: ${wcPath}, hasContent: ${hasContent}, length: ${contentLength} bytes`)

                // Check if content is undefined (not just empty string)
                if (op.content === undefined || op.content === null) {
                  console.warn(`[Boot] ⚠️ Content is undefined/null for ${wcPath}, trying to read from VFS...`)
                  // Try to read from VFS
                  try {
                    const node = useFileSystemStore.getState().getNodeByPath(op.path)
                    if (node) {
                      const content = await useFileSystemStore.getState().readFileContent(node.id)
                      await webcontainer.fs.writeFile(wcPath, content)
                      console.log(`[Boot] ✅ Queued file (from VFS): ${wcPath} (${content.length} bytes)`)
                    } else {
                      console.warn(`[Boot] ⚠️ Node not found in VFS, writing empty file: ${wcPath}`)
                      await webcontainer.fs.writeFile(wcPath, '')
                    }
                  } catch (readErr) {
                    console.warn(`[Boot] ❌ Failed to read from VFS:`, readErr)
                    await webcontainer.fs.writeFile(wcPath, '')
                  }
                } else {
                  // Content exists (even if empty string), write it
                  await webcontainer.fs.writeFile(wcPath, op.content)
                  console.log(`[Boot] ✅ Queued file written: ${wcPath} (${contentLength} bytes)`)
                }
                processed++
              } else if (op.type === 'unlink') {
                await webcontainer.fs.rm(wcPath, { recursive: true })
                console.log(`[Boot] ✅ Queued unlink: ${wcPath}`)
                processed++
              }
            } catch (e) {
              console.warn(`[Boot] ⚠️ Failed to process queued operation:`, op, e)
            }
          }

          console.log(`[Boot] ✅ Processed ${processed}/${queuedOps.length} queued operations`)
        }

        // Skip final verification sync - mount already handled everything
        console.log('[Boot] Skipping final verification sync (not needed)')

        // Load debug tools in development
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          try {
            await import('@/os/utils/debugSync')
          } catch (e) {
            console.warn('[Boot] Failed to load debug tools:', e)
          }
        }

        console.log('[Boot] ✅ Boot complete, all sync operations processed')

        // --- Bi-directional Sync Implementation ---

        // 3. WebContainer -> VFS (fs.watch)
        // Watch root to capture all changes
        webcontainer.fs.watch('/', { recursive: true }, async (event, filename) => {
          // Set sync flag to prevent circular sync
          set({ isSyncingFromWC: true })

          try {
            // Explicitly check if filename is string. fs.watch type definition might be loose.
            if (typeof filename !== 'string' || !filename) return

            console.log(`[WC->VFS] File change detected: ${event} ${filename}`)

            // Ignore hidden files/directories
            if (filename.includes('/.') || filename.startsWith('.')) return

            // Special handling for node_modules:
            // We DO NOT want to sync thousands of files to VFS (performance killer).
            // Instead, we just ensure a "node_modules" folder exists in VFS so the user knows it's there.
            if (filename.includes('node_modules')) {
              // Only react if it's the root node_modules folder creation
              // e.g. "apps/my-app/node_modules" or "node_modules"
              if (filename.endsWith('node_modules') && event === 'rename') {
                const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename
                const vfsPath = `${SYSTEM_PATHS.USER}/${cleanFilename}`

                // Check if we need to create the placeholder folder
                const existing = useFileSystemStore.getState().getNodeByPath(vfsPath);
                if (!existing) {
                  // Ensure parent exists first
                  const parentPath = vfsPath.split('/').slice(0, -1).join('/');
                  const parentNode = useFileSystemStore.getState().getNodeByPath(parentPath);

                  if (parentNode) {
                    console.log('[WC->VFS] Creating node_modules placeholder:', vfsPath);
                    // Create empty folder. We won't sync its children.
                    await createItem(parentNode.id, 'node_modules', 'folder', undefined, undefined, { source: 'wc' });
                  }
                }
              }
              return;
            }

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
                await deleteItem(node.id, { source: 'wc' })
              }
            } else {
              // Recursive parent creation logic
              const parentPath = vfsPath.split('/').slice(0, -1).join('/')

              // Helper to recursively create parent directories if missing
              const ensureParentExists = async (path: string): Promise<string | null> => {
                if (!path || path === '') return rootId;

                const existing = useFileSystemStore.getState().getNodeByPath(path);
                if (existing) return existing.id;

                // Recursively ensure grand-parent exists
                const grandParentPath = path.split('/').slice(0, -1).join('/');
                const grandParentId = await ensureParentExists(grandParentPath);

                if (!grandParentId) return null;

                // Create current directory
                const dirName = path.split('/').pop() || '';
                if (!dirName) return null;

                console.log('[WC->VFS] Creating missing parent:', path);
                await createItem(grandParentId, dirName, 'folder', undefined, undefined, { source: 'wc' });

                // Fetch the newly created node
                // Add small delay for state propagation
                await new Promise(r => setTimeout(r, 20));
                const newNode = useFileSystemStore.getState().getNodeByPath(path);
                return newNode ? newNode.id : null;
              };

              const parentId = await ensureParentExists(parentPath);
              if (!parentId) {
                console.warn('[WC->VFS] Failed to resolve parent for:', vfsPath);
                return;
              }

              const existingNode = useFileSystemStore.getState().getNodeByPath(vfsPath)

              if (entry.isDirectory()) {
                if (!existingNode) {
                  console.log('[WC->VFS] Creating Folder:', vfsPath)
                  await createItem(parentId, name, 'folder', undefined, undefined, { source: 'wc' })
                }
              } else {
                const fullWcPath = filename.startsWith('/') ? filename : `/${filename}`
                const content = await webcontainer.fs.readFile(fullWcPath, 'utf-8') as string

                if (!existingNode) {
                  // CRITICAL: If file is new but content is empty, skip to avoid ghost files
                  if (content === '') {
                    console.log('[WC->VFS] Skipping creation of empty file:', vfsPath)
                    return
                  }
                  console.log('[WC->VFS] Creating File:', vfsPath)
                  await createItem(parentId, name, 'file', content, undefined, { source: 'wc' })
                } else {
                  // Compare content to avoid infinite sync loops (VFS -> WC -> VFS)
                  // This is critical for watched files like vite.config.js
                  const currentContent = await useFileSystemStore.getState().readFileContent(existingNode.id)

                  // CRITICAL PROTECTION: Never overwrite a non-empty VFS file with empty WC content
                  // This happens during race conditions where WC watcher triggers before file is flushed to disk
                  if (content === '' && currentContent !== '') {
                    console.log('[WC->VFS] Protected: Skipping overwrite of non-empty file with empty content:', vfsPath)
                    return
                  }

                  // Only update if content actually changed
                  if (currentContent !== content) {
                    console.log('[WC->VFS] Updating File (content changed):', vfsPath)
                    await updateFileContent(existingNode.id, content, { source: 'wc' })
                  }
                }
              }
            }
          } catch (e: any) {
            // Suppress expected NotFoundError during rapid sync
            if (e.message && (e.message.includes('not be found') || e.message.includes('ENOENT'))) {
              // console.debug('[WC->VFS] Sync skipped (file missing):', filename)
              return
            }
            console.error('[WC->VFS] Sync Error:', e)
          } finally {
            // Reset sync flag after a short delay to allow the sync to complete
            setTimeout(() => set({ isSyncingFromWC: false }), 100)
          }
        })

        webcontainer.on('server-ready', (port, url) => {
          console.log(`[WC] Server ready: port=${port}, url=${url}`)

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('server-ready', {
              detail: { port, url }
            }));

            setTimeout(async () => {
              try {
                const { useWindowStore } = await import('@/os/kernel/useWindowStore')
                const { launchApp, windows, activeWindowId, updateWindow, focusWindow } = useWindowStore.getState();

                const activeWin = activeWindowId ? (windows as any)[activeWindowId] : undefined
                const isWaitingBrowser = (w: any) =>
                  w?.appId === 'browser' &&
                  w?.componentProps &&
                  (w.componentProps as any).waitForServer === true

                let targetBrowser: any | undefined = undefined
                if (isWaitingBrowser(activeWin)) {
                  targetBrowser = activeWin
                } else {
                  const waiting = Object.values(windows).filter(isWaitingBrowser) as any[]
                  if (waiting.length > 0) {
                    targetBrowser = waiting.sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))[0]
                  }
                }

                if (targetBrowser) {
                  updateWindow(targetBrowser.id, {
                    componentProps: {
                      ...(targetBrowser.componentProps || {}),
                      initialUrl: url,
                      url,
                      waitForServer: false,
                      launchStatus: undefined,
                      launchLabel: undefined
                    }
                  })
                  focusWindow(targetBrowser.id)
                  return
                }

                const existingBrowser = Object.values(windows).find(
                  (w: any) => w.appId === 'browser' && w.componentProps?.initialUrl === url
                );

                if (!existingBrowser) {
                  // Do not auto-launch browser for background processes
                  // Instead, show a toast with action
                  toast.custom({
                    type: 'success',
                    title: 'App Server Ready',
                    message: `Port ${port} is now listening`,
                    duration: 5000,
                    action: {
                      label: 'Open',
                      onClick: () => {
                        launchApp('browser', 'Browser', 'browser', undefined, {
                          initialUrl: url,
                          width: 1024,
                          height: 768
                        });
                      }
                    }
                  });
                }
              } catch (e) {
                console.warn('Auto-launch browser error:', e);
              }
            }, 500);
          }
        })

        // Don't set instance here, it's set before queue processing
        // set({ instance: webcontainer, isBooting: false })
        // globalWebContainerInstance = webcontainer

        // Process queued sync operations AFTER instance is set
        // (This line is just a marker, actual processing happens above)
      } catch (err) {
        console.error('Failed to boot WebContainer:', err)
        set({
          error: err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? (err as any).message || JSON.stringify(err) : String(err)),
          isBooting: false,
          isSyncingFromWC: false
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
