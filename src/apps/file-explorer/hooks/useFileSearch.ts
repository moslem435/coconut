/**
 * 文件搜索 Hook
 * 支持全局搜索、内容搜索、过滤器
 */

import { useState, useCallback, useMemo } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import Fuse from 'fuse.js'

export interface SearchFilter {
  fileTypes?: string[] // e.g., ['jpg', 'png', 'pdf']
  minSize?: number // bytes
  maxSize?: number // bytes
  dateFrom?: number // timestamp
  dateTo?: number // timestamp
  folders?: string[] // folder IDs to search in
}

export interface SearchResult {
  node: FileNode
  score: number
  matches?: string[]
  path: string
}

export function useFileSearch() {
  const { files, getPath, resolvePath } = useFileSystemStore()
  const [isSearching, setIsSearching] = useState(false)

  /**
   * Get all searchable files
   */
  const getAllFiles = useCallback((): FileNode[] => {
    return Object.values(files).filter(f => {
      // Exclude system folders and root
      if (f.isSystem && f.type === 'folder') return false
      if (f.id === 'root') return false
      return true
    })
  }, [files])

  /**
   * Apply filters to file list
   */
  const applyFilters = useCallback((
    fileList: FileNode[],
    filter: SearchFilter
  ): FileNode[] => {
    let filtered = fileList

    // File type filter
    if (filter.fileTypes && filter.fileTypes.length > 0) {
      filtered = filtered.filter(f => {
        if (f.type === 'folder') return true // Always include folders
        const ext = f.name.split('.').pop()?.toLowerCase()
        return ext && filter.fileTypes!.includes(ext)
      })
    }

    // Size filter
    if (filter.minSize !== undefined) {
      filtered = filtered.filter(f => (f.size || 0) >= filter.minSize!)
    }
    if (filter.maxSize !== undefined) {
      filtered = filtered.filter(f => (f.size || 0) <= filter.maxSize!)
    }

    // Date filter
    if (filter.dateFrom !== undefined) {
      filtered = filtered.filter(f => f.updatedAt >= filter.dateFrom!)
    }
    if (filter.dateTo !== undefined) {
      filtered = filtered.filter(f => f.updatedAt <= filter.dateTo!)
    }

    // Folder filter
    if (filter.folders && filter.folders.length > 0) {
      filtered = filtered.filter(f => {
        const path = getPath(f.id)
        return filter.folders!.some(folderId => 
          path.some(p => p.id === folderId)
        )
      })
    }

    return filtered
  }, [getPath])

  /**
   * Search files by name (fuzzy search)
   */
  const searchByName = useCallback((
    query: string,
    filter?: SearchFilter
  ): SearchResult[] => {
    if (!query.trim()) return []

    setIsSearching(true)

    try {
      let fileList = getAllFiles()

      // Apply filters
      if (filter) {
        fileList = applyFilters(fileList, filter)
      }

      // Fuzzy search
      const fuse = new Fuse(fileList, {
        keys: ['name'],
        threshold: 0.3,
        includeScore: true,
        includeMatches: true
      })

      const results = fuse.search(query)

      return results.map(result => ({
        node: result.item,
        score: result.score || 0,
        matches: result.matches?.map(m => m.value || ''),
        path: resolvePath(result.item.id)
      }))
    } finally {
      setIsSearching(false)
    }
  }, [getAllFiles, applyFilters, resolvePath])

  /**
   * Search files by content (text files only)
   */
  const searchByContent = useCallback(async (
    query: string,
    filter?: SearchFilter
  ): Promise<SearchResult[]> => {
    if (!query.trim()) return []

    setIsSearching(true)

    try {
      let fileList = getAllFiles()

      // Only search text files
      fileList = fileList.filter(f => {
        if (f.type === 'folder') return false
        const ext = f.name.split('.').pop()?.toLowerCase()
        const textExtensions = ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'log']
        return ext && textExtensions.includes(ext)
      })

      // Apply filters
      if (filter) {
        fileList = applyFilters(fileList, filter)
      }

      // Search content (limit to first 100 files for performance)
      const results: SearchResult[] = []
      const searchLimit = Math.min(fileList.length, 100)

      for (let i = 0; i < searchLimit; i++) {
        const file = fileList[i]
        if (!file) continue

        try {
          const content = await useFileSystemStore.getState().readFileContent(file.id)
          if (content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              node: file,
              score: 0,
              path: resolvePath(file.id)
            })
          }
        } catch {
          // Skip files that can't be read
        }
      }

      return results
    } finally {
      setIsSearching(false)
    }
  }, [getAllFiles, applyFilters, resolvePath])

  /**
   * Get recent files (sorted by modification time)
   */
  const getRecentFiles = useCallback((
    limit: number = 20,
    filter?: SearchFilter
  ): SearchResult[] => {
    let fileList = getAllFiles()

    // Apply filters
    if (filter) {
      fileList = applyFilters(fileList, filter)
    }

    // Sort by modification time
    const sorted = fileList
      .filter(f => f.type === 'file') // Only files, not folders
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)

    return sorted.map(node => ({
      node,
      score: 0,
      path: resolvePath(node.id)
    }))
  }, [getAllFiles, applyFilters, resolvePath])

  /**
   * Get large files (sorted by size)
   */
  const getLargeFiles = useCallback((
    limit: number = 20,
    minSize: number = 1024 * 1024 // 1MB
  ): SearchResult[] => {
    const fileList = getAllFiles()

    const sorted = fileList
      .filter(f => f.type === 'file' && (f.size || 0) >= minSize)
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, limit)

    return sorted.map(node => ({
      node,
      score: 0,
      path: resolvePath(node.id)
    }))
  }, [getAllFiles, resolvePath])

  return {
    isSearching,
    searchByName,
    searchByContent,
    getRecentFiles,
    getLargeFiles
  }
}
