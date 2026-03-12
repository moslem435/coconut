/**
 * @fileoverview 剪贴板 Store - 文件复制、剪切、粘贴操作管理
 * 
 * 为什么需要单独的剪贴板 Store：
 * - 剪切/复制状态需要跨窗口共享，单独 Store 方便任意地方读取
 * - 粗贴操作涉及文件系统写入，需要异步处理
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-02-13
 * @module src/os/kernel/useClipboardStore
 */

import { create } from 'zustand'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { v4 as uuidv4 } from 'uuid'

/**
 * 剪贴板状态接口
 */
interface ClipboardState {
    /** 剪贴板内容：文件ID列表和操作类型 */
    clipboard: { items: string[], op: 'copy' | 'cut' | null }
    /** 设置剪贴板内容 */
    setClipboard: (items: string[], op: 'copy' | 'cut') => void
    /**
     * 将剪贴板内容粘贴到目标文件夹
     * @param targetFolderId - 目标文件夹ID
     */
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

            // 名称冲突检测：确保粘贴后文件名不重复
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
                // 剪切操作：移动并重命名（如果存在名称冲突）
                if (newName !== item.name) {
                    await fsStore.renameItem(itemId, newName)
                }
                await fsStore.moveItem(itemId, targetFolderId)
            } else {
                // 复制操作：递归复制整个目录树
                const sourcePath = fsStore.resolvePath(itemId)
                const destPath = targetPath === '/' ? `/${newName}` : `${targetPath}/${newName}`

                try {
                    // 第一步：物理复制（写入文件系统）
                    // @ts-ignore - copy is public in FileSystemClient but might be missing in TS definition
                    await fs.copy(sourcePath, destPath)

                    // 第二步：状态复制（更新Zustand Store第一常量）
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
