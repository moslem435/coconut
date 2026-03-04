import { create } from 'zustand'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { FILE_IDS } from '@/os/config/paths'

interface TrashState {
    trashItems: (ids: string[]) => void
    restoreItems: (ids: string[]) => void
    emptyTrash: () => void
}

export const useTrashStore = create<TrashState>()((set, get) => ({
    trashItems: (ids: string[]) => {
        const fsStore = useFileSystemStore.getState()
        ids.forEach(id => {
            const node = fsStore.files[id]
            if (node) {
                // Use moveItem to ensure physical move in OPFS and trigger sync events
                fsStore.moveItem(id, FILE_IDS.TRASH).then(() => {
                    // Patch originalParentId after move
                    fsStore.patchNode(id, {
                        originalParentId: node.parentId
                    })
                }).catch(err => {
                    console.error('Failed to move item to trash:', err)
                })
            }
        })
    },

    restoreItems: (ids: string[]) => {
        const fsStore = useFileSystemStore.getState()
        ids.forEach(id => {
            const node = fsStore.files[id]
            if (node) {
                const originalParent = node.originalParentId || FILE_IDS.DESKTOP
                // Check if original parent still exists, if not, move to desktop
                const targetParent = fsStore.files[originalParent] ? originalParent : FILE_IDS.DESKTOP

                // Use moveItem to ensure physical move
                fsStore.moveItem(id, targetParent).then(() => {
                    fsStore.patchNode(id, {
                        originalParentId: null
                    })
                }).catch(err => {
                    console.error('Failed to restore item:', err)
                })
            }
        })
    },

    emptyTrash: () => {
        const fsStore = useFileSystemStore.getState()
        const trashItems = Object.values(fsStore.files).filter(f => f?.parentId === FILE_IDS.TRASH)

        // Use deleteItem for each item
        // Note: deleteItem is async but we treat this fire-and-forget for now 
        // or we could make emptyTrash async.
        // The original was sync state update. deleteItem is optimistic so it updates state immediately.
        trashItems.forEach(item => {
            if (item) fsStore.deleteItem(item.id)
        })
    }
}))
