import { create } from 'zustand'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { v4 as uuidv4 } from 'uuid'

interface ClipboardState {
    clipboard: { items: string[], op: 'copy' | 'cut' | null }
    setClipboard: (items: string[], op: 'copy' | 'cut') => void
    pasteItems: (targetFolderId: string) => Promise<void>
}

export const useClipboardStore = create<ClipboardState>()((set, get) => ({
    clipboard: { items: [], op: null },
    setClipboard: (items, op) => set({ clipboard: { items, op } }),

    pasteItems: async (targetFolderId) => {
        const { clipboard } = get()
        if (!clipboard.op || clipboard.items.length === 0) return

        const fsStore = useFileSystemStore.getState()
        const targetFolder = fsStore.files[targetFolderId]
        if (!targetFolder || targetFolder.type !== 'folder') return

        const targetPath = fsStore.resolvePath(targetFolderId)

        for (const itemId of clipboard.items) {
            const item = fsStore.files[itemId]
            if (!item) continue

            // Name collision check
            let newName = item.name
            let counter = 1
            const hasCollision = (name: string) => Object.values(fsStore.files).some(f =>
                f.parentId === targetFolderId && f.name === name && f.id !== itemId
            )

            while (hasCollision(newName)) {
                const nameParts = item.name.split('.')
                if (item.type === 'file' && nameParts.length > 1) {
                    const ext = nameParts.pop()
                    newName = `${nameParts.join('.')} (${counter}).${ext}`
                } else {
                    newName = `${item.name} (${counter})`
                }
                counter++
            }

            if (clipboard.op === 'cut') {
                // Cut: Move and Rename
                if (newName !== item.name) {
                    await fsStore.renameItem(itemId, newName)
                }
                await fsStore.moveItem(itemId, targetFolderId)
            } else {
                // Copy: Recursive
                const sourcePath = fsStore.resolvePath(itemId)
                const destPath = targetPath === '/' ? `/${newName}` : `${targetPath}/${newName}`

                try {
                    // 1. Physical Copy
                    // @ts-ignore - copy is public in FileSystemClient but might be missing in TS definition
                    await fs.copy(sourcePath, destPath)

                    // 2. State Copy (Recursive)
                    useFileSystemStore.setState((state) => {
                        const newFiles = { ...state.files }

                        const copyNodeRecursive = (originalId: string, newParentId: string, nameOverride?: string) => {
                            const originalNode = state.files[originalId]
                            if (!originalNode) return

                            const newId = uuidv4()
                            const newNode: FileNode = {
                                ...originalNode,
                                id: newId,
                                parentId: newParentId,
                                name: nameOverride || originalNode.name,
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            }
                            newFiles[newId] = newNode

                            if (originalNode.type === 'folder') {
                                const children = Object.values(state.files).filter(f => f.parentId === originalId)
                                children.forEach(child => copyNodeRecursive(child.id, newId))
                            }
                        }
                        copyNodeRecursive(itemId, targetFolderId, newName)
                        return { files: newFiles }
                    })

                } catch (e) {
                    console.error('Copy failed:', e)
                }
            }
        }

        if (clipboard.op === 'cut') {
            set({ clipboard: { items: [], op: null } })
        }
    }
}))
