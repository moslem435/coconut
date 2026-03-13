/**
 * 文件系统 IO 服务
 * 处理所有文件读写操作，支持流式传输
 */

import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { FilePath } from '@/types/branded'
import { PathValidator } from '@/os/security/PathValidator'
import { LRUCache, BlobCache } from '@/os/utils/LRUCache'
import { eventBus } from '@/os/kernel/EventBus'
import { FileStat } from '@/os/kernel/filesystem/IFileSystemProvider'

export interface ReadStreamOptions {
  chunkSize?: number
  onProgress?: (bytesRead: number, totalBytes: number) => void
  signal?: AbortSignal
}

export interface WriteStreamOptions {
  onProgress?: (bytesWritten: number) => void
  signal?: AbortSignal
}

// Re-export FileStat for compatibility
export type FileStats = FileStat

class FileSystemIOService {
  private readonly CHUNK_SIZE = 1024 * 1024 // 1MB chunks
  private readonly LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

  // Caches
  private contentCache = new LRUCache<string, string>(20 * 1024 * 1024, 5 * 60 * 1000) // 20MB, 5min
  private blobCache = new BlobCache(30 * 1024 * 1024, 5 * 60 * 1000) // 30MB, 5min

  constructor() {
    // Listen for file changes and invalidate cache
    if (typeof window !== 'undefined') {
      eventBus.on('fs:file:updated', ({ path }) => {
        this.invalidateCache(path)
      })
      eventBus.on('fs:file:deleted', ({ path }) => {
        this.invalidateCache(path)
      })
      eventBus.on('fs:file:renamed', ({ oldPath, newPath }) => {
        this.invalidateCache(oldPath)
        this.invalidateCache(newPath)
      })

      // Periodic cleanup
      setInterval(() => {
        this.contentCache.cleanup()
        this.blobCache.cleanup()
      }, 60 * 1000) // Every minute
    }
  }

  /**
   * Invalidate cache for a path
   */
  private invalidateCache(path: string): void {
    this.contentCache.delete(path)
    this.blobCache.delete(path)
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats() {
    return {
      content: this.contentCache.getStats(),
      blob: this.blobCache.getStats()
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.contentCache.clear()
    this.blobCache.clear()
  }

  /**
   * Preload blob into cache (e.g. for optimistic UI updates)
   */
  preloadBlob(path: string, content: Uint8Array | Blob): void {
    PathValidator.validate(path)
    const blob = content instanceof Blob ? content : new Blob([new Uint8Array(content)])
    this.blobCache.setBlob(path, blob)
  }

  /**
   * 读取文件内容（自动选择流式或一次性读取）
   */
  async readFile(path: string): Promise<string> {
    PathValidator.validate(path)
    
    // Check cache first
    const cached = this.contentCache.get(path)
    if (cached !== undefined) {
      return cached
    }

    try {
      // 检查文件大小
      const stats = await this.stat(path)
      
      let content: string
      if (stats.size > this.LARGE_FILE_THRESHOLD) {
        // 大文件使用流式读取
        content = await this.readFileStream(path)
      } else {
        // 小文件一次性读取
        const buffer = await fs.readFile(path)
        content = new TextDecoder().decode(buffer)
      }

      // Cache the result
      this.contentCache.set(path, content, stats.size)

      return content
    } catch (error: any) {
      if (error.message?.includes('File not found')) {
        // Expected error for missing files, just warn or ignore
        // console.warn(`[IOService] File not found: ${path}`)
      } else {
        console.error(`[IOService] Failed to read file ${path}:`, error)
      }
      throw error
    }
  }

  /**
   * 流式读取文件（用于大文件）
   */
  async readFileStream(
    path: string,
    options: ReadStreamOptions = {}
  ): Promise<string> {
    PathValidator.validate(path)
    
    const {
      chunkSize = this.CHUNK_SIZE,
      onProgress,
      signal
    } = options

    try {
      const stats = await this.stat(path)
      const totalBytes = stats.size
      let bytesRead = 0
      const chunks: Uint8Array[] = []

      // 模拟流式读取（OPFS 不直接支持流，但我们可以分块读取）
      const buffer = await fs.readFile(path)
      
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        // 检查是否取消
        if (signal?.aborted) {
          throw new Error('Read operation cancelled')
        }

        const chunk = buffer.slice(offset, Math.min(offset + chunkSize, buffer.length))
        chunks.push(chunk)
        bytesRead += chunk.length

        // 报告进度
        if (onProgress) {
          onProgress(bytesRead, totalBytes)
        }

        // 让出控制权，避免阻塞 UI
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // 合并所有块
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let position = 0
      for (const chunk of chunks) {
        result.set(chunk, position)
        position += chunk.length
      }

      return new TextDecoder().decode(result)
    } catch (error) {
      console.error(`[IOService] Stream read failed for ${path}:`, error)
      throw error
    }
  }

  /**
   * 获取文件 Blob (用于大文件/流式传输)
   */
  async getFileBlob(path: string): Promise<Blob> {
    PathValidator.validate(path)
    
    // Check cache first (returns object URL)
    const cachedUrl = this.blobCache.get(path)
    if (cachedUrl !== undefined) {
      // Fetch blob from cached URL
      const response = await fetch(cachedUrl)
      return await response.blob()
    }

    try {
      const blob = await fs.getFileBlob(path)
      
      // Cache the blob (creates object URL)
      this.blobCache.setBlob(path, blob)

      return blob
    } catch (error: any) {
      // Suppress "not found" errors which are expected during sync or polling
      if (error.message?.includes('could not be found') || error.name === 'NotFoundError') {
        // file not found is expected in some cases
      } else {
        console.error(`[IOService] Failed to get blob for ${path}:`, error)
      }
      throw error
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    PathValidator.validate(path)
    
    // Invalidate cache
    this.invalidateCache(path)

    try {
      if (content === undefined || content === null) {
          throw new Error('Content cannot be null or undefined');
      }

      const data = typeof content === 'string' 
        ? new TextEncoder().encode(content)
        : content

      if (data.length > this.LARGE_FILE_THRESHOLD) {
        // 大文件使用流式写入
        await this.writeFileStream(path, data)
      } else {
        // 小文件一次性写入
        await fs.writeFile(path, data)
      }
    } catch (error) {
      console.error(`[IOService] Failed to write file ${path}:`, error)
      throw error
    }
  }

  /**
   * 流式写入文件（用于大文件）
   */
  async writeFileStream(
    path: string,
    data: Uint8Array,
    options: WriteStreamOptions = {}
  ): Promise<void> {
    PathValidator.validate(path)
    
    const { onProgress, signal } = options

    try {
      // OPFS 不直接支持流式写入，但我们可以分块写入
      // 注意：这里简化实现，实际应该使用 FileSystemWritableFileStream
      let bytesWritten = 0

      for (let offset = 0; offset < data.length; offset += this.CHUNK_SIZE) {
        if (signal?.aborted) {
          throw new Error('Write operation cancelled')
        }

        bytesWritten += Math.min(this.CHUNK_SIZE, data.length - offset)

        if (onProgress) {
          onProgress(bytesWritten)
        }

        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // 最终写入
      await fs.writeFile(path, data)
    } catch (error) {
      console.error(`[IOService] Stream write failed for ${path}:`, error)
      throw error
    }
  }

  /**
   * 创建目录
   */
  async mkdir(path: string): Promise<void> {
    PathValidator.validate(path)
    
    try {
      await fs.mkdir(path)
    } catch (error) {
      console.error(`[IOService] Failed to create directory ${path}:`, error)
      throw error
    }
  }

  /**
   * 删除文件或目录
   */
  async unlink(path: string, recursive: boolean = false): Promise<void> {
    PathValidator.validate(path)
    
    if (path === '/' || path === '') {
      throw new Error('Cannot delete root directory')
    }

    try {
      await fs.unlink(path, recursive)
    } catch (error) {
      console.error(`[IOService] Failed to delete ${path}:`, error)
      throw error
    }
  }

  /**
   * 重命名/移动文件
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    PathValidator.validate(oldPath)
    PathValidator.validate(newPath)
    
    try {
      await fs.rename(oldPath, newPath)
    } catch (error) {
      const anyErr: any = error
      const msg = String(anyErr?.message || '')
      const isNotFound = anyErr?.code === 'ENOENT' || msg.includes('ENOENT') || msg.includes('no such file or directory')
      const isTrashMove = newPath.includes('/Trash/')
      if (isNotFound && isTrashMove) {
        return
      }
      console.error(`[IOService] Failed to rename ${oldPath} to ${newPath}:`, error)
      throw error
    }
  }

  /**
   * 获取文件/目录信息
   */
  async stat(path: string): Promise<FileStats> {
    PathValidator.validate(path)
    
    try {
      return await fs.stat(path)
    } catch (error: any) {
      if (error.message?.includes('File not found')) {
        // Expected error, ignore log
      } else {
        console.error(`[IOService] Failed to stat ${path}:`, error)
      }
      throw error
    }
  }

  /**
   * 读取目录内容
   */
  async readdir(path: string): Promise<string[]> {
    PathValidator.validate(path)
    
    try {
      return await fs.readdir(path)
    } catch (error) {
      console.error(`[IOService] Failed to read directory ${path}:`, error)
      throw error
    }
  }

  /**
   * 检查路径是否存在
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * 批量读取文件（并行）
   */
  async readFiles(paths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    
    await Promise.allSettled(
      paths.map(async (path) => {
        try {
          const content = await this.readFile(path)
          results.set(path, content)
        } catch (error) {
          console.warn(`[IOService] Failed to read ${path}:`, error)
        }
      })
    )

    return results
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    PathValidator.validate(sourcePath)
    PathValidator.validate(destPath)
    
    try {
      const content = await fs.readFile(sourcePath)
      await fs.writeFile(destPath, content)
    } catch (error) {
      console.error(`[IOService] Failed to copy ${sourcePath} to ${destPath}:`, error)
      throw error
    }
  }

  /**
   * 递归复制目录
   */
  async copyDirectory(sourcePath: string, destPath: string): Promise<void> {
    PathValidator.validate(sourcePath)
    PathValidator.validate(destPath)
    
    try {
      // 创建目标目录
      await this.mkdir(destPath)

      // 读取源目录内容
      const entries = await this.readdir(sourcePath)

      // 并行复制所有条目
      await Promise.all(
        entries.map(async (entry) => {
          const srcPath = `${sourcePath}/${entry}`
          const dstPath = `${destPath}/${entry}`
          
          const stats = await this.stat(srcPath)
          
          if (stats.isDirectory) {
            await this.copyDirectory(srcPath, dstPath)
          } else {
            await this.copyFile(srcPath, dstPath)
          }
        })
      )
    } catch (error) {
      console.error(`[IOService] Failed to copy directory ${sourcePath}:`, error)
      throw error
    }
  }
}

// 导出单例
export const ioService = new FileSystemIOService()
