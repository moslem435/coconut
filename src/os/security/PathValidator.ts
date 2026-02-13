/**
 * 路径验证和安全检查
 * 防止路径遍历攻击和非法文件访问
 */

import { FilePath } from '@/types/branded'

export class PathValidationError extends Error {
  constructor(message: string, public readonly path: string) {
    super(message)
    this.name = 'PathValidationError'
  }
}

/**
 * 路径验证器
 */
export class PathValidator {
  private static readonly FORBIDDEN_PATTERNS = [
    /\.\./,           // 父目录引用
    /\/\//,           // 双斜杠
    /^[^/]/,          // 不以斜杠开头
    /\0/,             // 空字节
    /[<>:"|?*]/,      // Windows 非法字符
  ]

  private static readonly FORBIDDEN_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ])

  private static readonly MAX_PATH_LENGTH = 4096
  private static readonly MAX_COMPONENT_LENGTH = 255

  /**
   * 验证路径是否安全
   */
  static validate(path: string): void {
    // 检查路径长度
    if (path.length > this.MAX_PATH_LENGTH) {
      throw new PathValidationError(
        `Path too long (max ${this.MAX_PATH_LENGTH} characters)`,
        path
      )
    }

    // 检查禁止的模式
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(path)) {
        throw new PathValidationError(
          `Path contains forbidden pattern: ${pattern}`,
          path
        )
      }
    }

    // 检查路径组件
    const components = path.split('/').filter(Boolean)
    for (const component of components) {
      this.validateComponent(component, path)
    }
  }

  /**
   * 验证路径组件
   */
  private static validateComponent(component: string, fullPath: string): void {
    // 检查组件长度
    if (component.length > this.MAX_COMPONENT_LENGTH) {
      throw new PathValidationError(
        `Path component too long (max ${this.MAX_COMPONENT_LENGTH} characters)`,
        fullPath
      )
    }

    // 检查 Windows 保留名称
    const upperComponent = component.toUpperCase()
    if (this.FORBIDDEN_NAMES.has(upperComponent)) {
      throw new PathValidationError(
        `Path contains forbidden name: ${component}`,
        fullPath
      )
    }

    // 检查前导/尾随空格或点
    if (component !== component.trim()) {
      throw new PathValidationError(
        'Path component has leading or trailing whitespace',
        fullPath
      )
    }

    if (component.endsWith('.')) {
      throw new PathValidationError(
        'Path component ends with dot',
        fullPath
      )
    }
  }

  /**
   * 检查路径是否在允许的根目录下
   */
  static isWithinRoot(path: FilePath, root: FilePath): boolean {
    const normalizedPath = FilePath.normalize(path as string)
    const normalizedRoot = FilePath.normalize(root as string)
    
    return normalizedPath.startsWith(normalizedRoot)
  }

  /**
   * 检查路径是否为挂载点
   */
  static isMountPath(path: FilePath): boolean {
    return path.startsWith('/mnt/' as FilePath)
  }

  /**
   * 安全地连接路径
   */
  static safejoin(base: FilePath, ...parts: string[]): FilePath {
    const joined = FilePath.join(base, ...parts)
    this.validate(joined)
    
    // 确保结果路径仍在基础路径下
    if (!this.isWithinRoot(joined, base)) {
      throw new PathValidationError(
        'Joined path escapes base directory',
        joined
      )
    }
    
    return joined
  }

  /**
   * 清理路径（移除危险部分）
   */
  static sanitize(path: string): FilePath {
    // 移除空字节
    path = path.replace(/\0/g, '')
    
    // 规范化路径
    const normalized = FilePath.normalize(path)
    
    // 验证清理后的路径
    this.validate(normalized)
    
    return normalized
  }
}

/**
 * 文件访问权限检查
 */
export class FileAccessControl {
  private static readonly ALLOWED_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx',
    '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
    '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs',
    '.php', '.rb', '.sql', '.sh', '.bat', '.ps1'
  ])

  private static readonly FORBIDDEN_EXTENSIONS = new Set([
    '.exe', '.dll', '.so', '.dylib', '.app',
    '.msi', '.dmg', '.pkg', '.deb', '.rpm'
  ])

  /**
   * 检查文件扩展名是否允许
   */
  static isExtensionAllowed(filename: string): boolean {
    const ext = FilePath.extname(FilePath.create('/' + filename)).toLowerCase()
    
    // 检查是否在禁止列表中
    if (this.FORBIDDEN_EXTENSIONS.has(ext)) {
      return false
    }
    
    // 如果没有扩展名，允许（可能是文件夹）
    if (!ext) {
      return true
    }
    
    // 检查是否在允许列表中
    return this.ALLOWED_EXTENSIONS.has(ext)
  }

  /**
   * 检查文件大小是否在限制内
   */
  static isSizeAllowed(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize
  }
}
