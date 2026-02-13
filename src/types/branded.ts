/**
 * Branded Types - 类型安全的字符串包装
 * 防止不同类型的字符串被错误使用
 */

declare const brand: unique symbol

export type Brand<T, TBrand extends string> = T & { [brand]: TBrand }

// 文件系统路径类型
export type FilePath = Brand<string, 'FilePath'>
export type FileId = Brand<string, 'FileId'>
export type FolderId = Brand<string, 'FolderId'>

// 窗口和进程 ID
export type WindowId = Brand<string, 'WindowId'>
export type ProcessId = Brand<number, 'ProcessId'>
export type AppId = Brand<string, 'AppId'>

// 类型守卫和构造函数
export const FilePath = {
  create: (path: string): FilePath => {
    // 验证路径格式
    if (!path.startsWith('/')) {
      throw new Error(`Invalid file path: ${path}. Must start with /`)
    }
    return path as FilePath
  },
  
  isValid: (path: string): path is FilePath => {
    return path.startsWith('/')
  },
  
  normalize: (path: string): FilePath => {
    // 规范化路径：移除多余的斜杠、处理 . 和 ..
    const parts = path.split('/').filter(Boolean)
    const normalized: string[] = []
    
    for (const part of parts) {
      if (part === '..') {
        normalized.pop()
      } else if (part !== '.') {
        normalized.push(part)
      }
    }
    
    return ('/' + normalized.join('/')) as FilePath
  },
  
  join: (...parts: string[]): FilePath => {
    const joined = parts.join('/').replace(/\/+/g, '/')
    return FilePath.normalize(joined)
  },
  
  dirname: (path: FilePath): FilePath => {
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    return ('/' + parts.join('/')) as FilePath
  },
  
  basename: (path: FilePath): string => {
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  },
  
  extname: (path: FilePath): string => {
    const base = FilePath.basename(path)
    const lastDot = base.lastIndexOf('.')
    return lastDot > 0 ? base.slice(lastDot) : ''
  }
}

export const FileId = {
  create: (id: string): FileId => id as FileId,
  isValid: (id: string): id is FileId => id.length > 0
}

export const FolderId = {
  create: (id: string): FolderId => id as FolderId,
  isValid: (id: string): id is FolderId => id.length > 0
}

export const WindowId = {
  create: (id: string): WindowId => id as WindowId,
  isValid: (id: string): id is WindowId => id.length > 0
}

export const ProcessId = {
  create: (id: number): ProcessId => id as ProcessId,
  isValid: (id: number): id is ProcessId => id > 0
}

export const AppId = {
  create: (id: string): AppId => id as AppId,
  isValid: (id: string): id is AppId => id.length > 0
}
