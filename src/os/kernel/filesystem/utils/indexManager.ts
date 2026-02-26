/**
 * IndexManager - 文件系统索引管理工具
 * 统一管理 childrenIndex 的构建和更新逻辑
 */

import type { FileNode } from '../../initialFileTree'

export interface ChildrenIndex {
  [parentId: string]: Set<string>
}

export type IndexOperation =
  | { type: 'ADD', nodeId: string, parentId: string }
  | { type: 'REMOVE', nodeId: string, parentId: string }
  | { type: 'MOVE', nodeId: string, oldParent: string, newParent: string }

/**
 * 从文件树构建完整索引
 */
export function buildIndex(files: Record<string, FileNode>): ChildrenIndex {
  const index: ChildrenIndex = {}

  Object.values(files).forEach(node => {
    if (node && node.parentId) {
      if (!index[node.parentId]) {
        index[node.parentId] = new Set()
      }
      index[node.parentId]!.add(node.id)
    }
  })

  return index
}

/**
 * 增量更新索引
 */
export function updateIndex(
  index: ChildrenIndex,
  operation: IndexOperation
): ChildrenIndex {
  const newIndex = { ...index }

  switch (operation.type) {
    case 'ADD': {
      if (!newIndex[operation.parentId]) {
        newIndex[operation.parentId] = new Set()
      }
      // 创建新 Set 以保持不可变性
      const parentSet = newIndex[operation.parentId]
      if (parentSet) {
        newIndex[operation.parentId] = new Set(parentSet)
        newIndex[operation.parentId]!.add(operation.nodeId)
      }
      break
    }

    case 'REMOVE': {
      const parentSet = newIndex[operation.parentId]
      if (parentSet) {
        newIndex[operation.parentId] = new Set(parentSet)
        newIndex[operation.parentId]!.delete(operation.nodeId)
      }
      break
    }

    case 'MOVE': {
      // 从旧父节点移除
      const oldParentSet = newIndex[operation.oldParent]
      if (oldParentSet) {
        newIndex[operation.oldParent] = new Set(oldParentSet)
        newIndex[operation.oldParent]!.delete(operation.nodeId)
      }
      // 添加到新父节点
      if (!newIndex[operation.newParent]) {
        newIndex[operation.newParent] = new Set()
      }
      const newParentSet = newIndex[operation.newParent]
      if (newParentSet) {
        newIndex[operation.newParent] = new Set(newParentSet)
        newIndex[operation.newParent]!.add(operation.nodeId)
      }
      break
    }
  }

  return newIndex
}

/**
 * 批量更新索引（性能优化）
 */
export function batchUpdateIndex(
  index: ChildrenIndex,
  operations: IndexOperation[]
): ChildrenIndex {
  let result = index
  operations.forEach(op => {
    result = updateIndex(result, op)
  })
  return result
}

/**
 * 收集节点的所有后代（递归）
 */
export function collectDescendants(
  nodeId: string,
  index: ChildrenIndex
): Set<string> {
  const result = new Set<string>([nodeId])

  const traverse = (id: string) => {
    const children = index[id]
    if (children) {
      children.forEach(childId => {
        result.add(childId)
        traverse(childId)
      })
    }
  }

  traverse(nodeId)
  return result
}

/**
 * 辅助函数：从索引获取子节点列表
 */
export function getChildrenFromIndex(
  files: Record<string, FileNode>,
  index: ChildrenIndex,
  parentId: string
): FileNode[] {
  const childIds = index[parentId]
  if (!childIds) return []

  return Array.from(childIds)
    .map(id => files[id])
    .filter((node): node is FileNode => node !== undefined)
}
