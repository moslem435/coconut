import { create } from 'zustand'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'

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
                fsStore.patchNode(id, {
                    parentId: 'trash',
                    originalParentId: node.parentId
                })
            }
        })
    },

    restoreItems: (ids: string[]) => {
        const fsStore = useFileSystemStore.getState()
        ids.forEach(id => {
            const node = fsStore.files[id]
            if (node) {
                const originalParent = node.originalParentId || 'desktop'
                // Check if original parent still exists, if not, move to desktop
                const targetParent = fsStore.files[originalParent] ? originalParent : 'desktop'

                fsStore.patchNode(id, {
                    parentId: targetParent,
                    originalParentId: null
                })
            }
        })
    },

    emptyTrash: () => {
        const fsStore = useFileSystemStore.getState()
        const trashItems = Object.values(fsStore.files).filter(f => f?.parentId === 'trash')

        // Use deleteItem for each item
        // Note: deleteItem is async but we treat this fire-and-forget for now 
        // or we could make emptyTrash async.
        // The original was sync state update. deleteItem is optimistic so it updates state immediately.
        trashItems.forEach(item => {
            if (item) fsStore.deleteItem(item.id)
        })
    }
}))
