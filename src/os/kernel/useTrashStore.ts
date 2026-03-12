/**
 * @fileoverview 回收站 Store - 文件删除、恢复、清空回收站操作
 * 
 * 为什么单独抽离回收站逻辑：
 * - 回收站和文件系统是两种不同抽象，就像 Windows的回收站也是独立的
 * - 回收站操作需记录 originalParentId，属于回收站特有属性
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-03-05
 * @module src/os/kernel/useTrashStore
 */

import { create } from 'zustand'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { FILE_IDS } from '@/os/config/paths'

/**
 * 回收站 Store 接口
 */
interface TrashState {
    /**
     * 将文件移进回收站
     * @param ids - 要删除的文件ID列表
     */
    trashItems: (ids: string[]) => void
    /**
     * 从回收站恢复文件到原来位置
     * @param ids - 要恢复的文件ID列表
     */
    restoreItems: (ids: string[]) => void
    /** 清空回收站所有文件 */
    emptyTrash: () => void
}

export const useTrashStore = create<TrashState>()((set, get) => ({
    trashItems: (ids: string[]) => {
        const fsStore = useFileSystemStore.getState()
        ids.forEach(id => {
            const node = fsStore.files[id]
            if (node) {
                try {
                    // 将文件移入回收站文件夹（moveItem 是同步乐观更新）
                    fsStore.moveItem(id, FILE_IDS.TRASH)
                    // 记录原始父级ID，恢复时使用
                    fsStore.patchNode(id, {
                        originalParentId: node.parentId
                    })
                } catch (err) {
                    console.error('Failed to move item to trash:', err)
                }
            }
        })
    },

    restoreItems: (ids: string[]) => {
        const fsStore = useFileSystemStore.getState()
        ids.forEach(id => {
            const node = fsStore.files[id]
            if (node) {
                const originalParent = node.originalParentId || FILE_IDS.DESKTOP
                // 检查原始父级是否仍然存在，否则恢复到桌面避免孤児文件
                const targetParent = fsStore.files[originalParent] ? originalParent : FILE_IDS.DESKTOP

                try {
                    // moveItem 是同步乐观更新
                    fsStore.moveItem(id, targetParent)
                    fsStore.patchNode(id, {
                        originalParentId: null
                    })
                } catch (err) {
                    console.error('Failed to restore item:', err)
                }
            }
        })
    },

    emptyTrash: () => {
        const fsStore = useFileSystemStore.getState()
        const trashItems = Object.values(fsStore.files).filter(f => f?.parentId === FILE_IDS.TRASH)

        // 逐个删除，deleteItem 为乐观同步更新，尽管内部会异步将变更同步到文件系统
        trashItems.forEach(item => {
            if (item) fsStore.deleteItem(item.id)
        })
    }
}))
