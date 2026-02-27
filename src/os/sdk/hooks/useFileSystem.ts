import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useCallback } from 'react'

export function useFileSystem() {
  const store = useFileSystemStore()

  const readFile = useCallback(async (path: string) => {
    const node = store.getNodeByPath(path)
    if (!node) {
      throw new Error(`File not found: ${path}`)
    }
    return store.readFileContent(node.id)
  }, [store.files])

  const writeFile = useCallback(async (path: string, content: string) => {
    const node = store.getNodeByPath(path)
    if (node) {
      store.updateFileContent(node.id, content)
      return node.id
    }

    // Create file logic
    const parts = path.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) throw new Error('Invalid path')
    
    const parentPath = '/' + parts.join('/')
    const parentNode = store.getNodeByPath(parentPath)
    
    if (!parentNode) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    if (parentNode.type !== 'folder') {
      throw new Error(`Parent is not a directory: ${parentPath}`)
    }

    return store.createItem(parentNode.id, fileName, 'file', content)
  }, [store.files])

  const createDirectory = useCallback(async (path: string) => {
    const node = store.getNodeByPath(path)
    if (node) {
      if (node.type === 'folder') return node.id
      throw new Error(`Path exists but is not a directory: ${path}`)
    }

    const parts = path.split('/').filter(Boolean)
    const dirName = parts.pop()
    if (!dirName) throw new Error('Invalid path')

    const parentPath = '/' + parts.join('/')
    const parentNode = store.getNodeByPath(parentPath)
    
    if (!parentNode) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    return store.createItem(parentNode.id, dirName, 'folder')
  }, [store.files])

  const readDirectory = useCallback((path: string) => {
    const node = store.getNodeByPath(path)
    if (!node) {
      throw new Error(`Directory not found: ${path}`)
    }
    if (node.type !== 'folder') {
      throw new Error(`Path is not a directory: ${path}`)
    }
    return store.getChildren(node.id)
  }, [store.files])

  const exists = useCallback((path: string) => {
    return !!store.getNodeByPath(path)
  }, [store.files])

  return {
    readFile,
    writeFile,
    createDirectory,
    readDirectory,
    exists
  }
}
