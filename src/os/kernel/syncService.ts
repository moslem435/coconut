import { FileSystemState, FileNode } from './useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { get, set as setIdx } from 'idb-keyval'
import { FILESYSTEM_VERSION } from './initialFileTree'

export const syncService = {
    syncToOPFS: async (state: FileSystemState, set: (partial: Partial<FileSystemState>) => void) => {
        // Optimization: Use IndexedDB versioning to determine if sync is needed
        try {
            const installedVersion = await get('fs_version')
            const rootExists = await fs.exists('/')

            if (rootExists && installedVersion === FILESYSTEM_VERSION) {
                console.log(`[SyncService] Version match (${FILESYSTEM_VERSION}), skipping sync.`)
                set({ isLoading: false })
                return
            }
        } catch (e) {
            console.warn('Failed to check version, proceeding with sync', e)
        }

        set({ isLoading: true })
        const files = Object.values(state.files)

        console.log('Starting VFS -> OPFS Initial Sync...')

        // Sort files to ensure folders are created before files
        const sortedFiles = files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1
            if (a.type !== 'folder' && b.type === 'folder') return 1
            return 0
        })

        for (const node of sortedFiles) {
            if (node.id === 'root' || node.id === 'trash') continue;

            const path = state.resolvePath(node.id)
            if (!path) continue

            // Skip mounted paths - they are already persisted on the native FS
            // and we don't want to overwrite them with potentially empty content
            if (path.startsWith('/mnt/')) continue

            try {
                if (node.type === 'folder') {
                    await fs.mkdir(path, true)
                } else {
                    // Ensure parent directory exists for file
                    const parentPath = path.substring(0, path.lastIndexOf('/'))
                    if (parentPath && parentPath !== '/') {
                        await fs.mkdir(parentPath, true)
                    }

                    // Initial Content Hydration (Only for initial static files)
                    let initialContent: string | Uint8Array = ''
                    if (node.name === 'hello_world.ts') initialContent = '// Hello World...'
                    if (node.name === 'Welcome.txt') initialContent = 'Welcome to Portfolio OS!...'

                    // Gallery Images
                    if (node.parentId === 'pictures' || (node.parentId === 'desktop' && node.name.endsWith('.jpg'))) {
                        try {
                            // Check if file name matches expected gallery files
                            // The gallery folder in public contains: abstract.jpg, colorful.jpg, gradient.jpg, cars.jpg
                            let fetchPath = `/gallery/${node.name}`
                            
                            // Map virtual files to existing assets
                            if (node.name === 'Abstract_01.jpg') fetchPath = '/gallery/abstract.jpg'
                            if (node.name === 'Cyber_City.jpg') fetchPath = '/wallpapers/city.jpg' // Use city wallpaper as cyber city
                            if (node.name === 'Workspace.jpg') fetchPath = '/wallpapers/default.jpg' // Use default wallpaper as workspace
                            
                            const response = await fetch(fetchPath)
                            if (response.ok) {
                                const blob = await response.blob()
                                initialContent = new Uint8Array(await blob.arrayBuffer())
                            } else {
                                console.warn(`Failed to fetch gallery image ${node.name} from ${fetchPath}: ${response.status} ${response.statusText}`)
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch gallery image ${node.name}`, e)
                        }
                    }

                    // Basic restoration of template content
                    if (node.id === 'code-1') initialContent = `// Hello World in TypeScript\nfunction sayHello(name: string): void {\n    console.log("Hello, " + name + "!");\n}\n\nconst user = "Developer";\nsayHello(user);`
                    if (node.id === 'welcome-txt') initialContent = 'Welcome to Portfolio OS! This is a simulated file system.'
                    if (node.id === 'about-md') initialContent = '# About Me\n\nI am a full-stack developer...'

                    await fs.writeFile(path, initialContent)
                }
            } catch (err) {
                console.warn(`Sync failed for ${path}`, err)
            }
        }
        
        // Update version after successful sync
        try {
            await setIdx('fs_version', FILESYSTEM_VERSION)
            console.log(`[SyncService] Updated fs_version to ${FILESYSTEM_VERSION}`)
        } catch (e) {
            console.warn('[SyncService] Failed to update fs_version', e)
        }

        console.log('VFS -> OPFS Sync Complete')
        set({ isLoading: false })
    }
}
