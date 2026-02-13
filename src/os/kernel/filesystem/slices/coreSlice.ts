/**
 * CoreSlice - 文件系统核心状态层
 * 职责：纯状态管理，无副作用
 */

import type { StateCreator } from 'zustand'
import type { FileNode, FileType } from '../../initialFileTree'
import { INITIAL_FILES, INITIAL_ROOT_ID } from '../../initialFileTree'
import * as indexManager from '../utils/indexManager'
import type { ChildrenIndex } from '../utils/indexManager'

export interface CoreSlice {
  // 状态
  files: Record<string, FileNode>
  rootId: string
  isLoading: boolean
  childrenIndex: ChildrenIndex
  
  // 纯状态更新方法（内部使用，前缀 _）
  _setFiles: (files: Record<string, FileNode>) => void
  _addFile: (file: FileNode) => void
  _updateFile: (id: string, updates: Partial<FileNode>) => void
  _deleteFiles: (ids: string[]) => void
  _setLoading: (loading: boolean) => void
  _rebuildIndex: () => void
  
  // 查询方法（无副作用）
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]
  resolvePath: (id: string) => string
  getNodeByPath: (path: string) => FileNode | undefined
}

export const createCoreSlice: StateCreator<CoreSlice> = (set, get) => ({
  // 初始状态
  files: INITIAL_FILES,
  rootId: INITIAL_ROOT_ID,
  isLoading: true,
  childrenIndex: indexManager.buildIndex(INITIAL_FILES),
  
  // 纯状态更新方法
  _setFiles: (files) => set({
    files,
    childrenIndex: indexManager.buildIndex(files)
  }),
  
  _addFile: (file) => set((state) => ({
    files: { ...state.files, [file.id]: file },
    childrenIndex: indexManager.updateIndex(
      state.childrenIndex,
      { type: 'ADD', nodeId: file.id, parentId: file.parentId }
    )
  })),
  
  _updateFile: (id, updates) => set((state) => {
    const node = state.files[id]
    if (!node) return state
    
    return {
      files: {
        ...state.files,
        [id]: { ...node, ...updates, updatedAt: Date.now() }
      }
    }
  }),
  
  _deleteFiles: (ids) => set((state) => {
    const newFiles = { ...state.files }
    let newIndex = state.childrenIndex
    
    ids.forEach(id => {
      const node = newFiles[id]
      if (node?.parentId) {
        newIndex = indexManager.updateIndex(
          newIndex,
          { type: 'REMOVE', nodeId: id, parentId: node.parentId }
        )
      }
      delete newFiles[id]
      delete newIndex[id]
    })
    
    return { files: newFiles, childrenIndex: newIndex }
  }),
  
  _setLoading: (loading) => set({ isLoading: loading }),
  
  _rebuildIndex: () => set((state) => ({
    childrenIndex: indexManager.buildIndex(state.files)
  })),
  
  // 查询方法
  getItem: (id) => get().files[id],
  
  getChildren: (parentId) => {
    const state = get()
    return indexManager.getChildrenFromIndex(
      state.files,
      state.childrenIndex,
      parentId
    )
  },
  
  getPath: (id) => {
    const files = get().files
    const path: FileNode[] = []
    let current = files[id]

    while (current) {
      path.unshift(current)
      if (!current.parentId) break
      current = files[current.parentId]
    }

    return path
  },
  
  resolvePath: (id) => {
    const state = get()
    const node = state.files[id]
    if (!node) return ''
    if (id === state.rootId) return '/'

    const pathNodes = state.getPath(id)

    // Check if path contains a mount point
    const mountIndex = pathNodes.findIndex(n => n.isMount)
    if (mountIndex !== -1) {
      const mountNode = pathNodes[mountIndex]
      if (mountNode) {
        const relativePath = pathNodes.slice(mountIndex + 1).map(n => n.name).join('/')
        return `/mnt/${mountNode.id}${relativePath ? '/' + relativePath : ''}` as string
      }
    }

    return '/' + pathNodes.slice(1).map(n => n.name).join('/')
  },
  
  getNodeByPath: (path) => {
    const state = get()
    if (!path || path === '/') return state.files[state.rootId]

    // Remove leading slash and split
    const parts = path.replace(/^\/+/, '').split('/')
    let currentId = state.rootId

    for (const part of parts) {
      const children = state.getChildren(currentId)
      const found = children.find(c => c.name === part)
      if (found) {
        currentId = found.id
      } else {
        return undefined
      }
    }
    return state.files[currentId]
  }
})
