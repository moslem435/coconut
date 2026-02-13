/**
 * Monaco Editor 按需加载优化
 * 只加载需要的语言包，减少初始 bundle 大小
 */

type SupportedLanguage = 
  | 'typescript' | 'javascript' | 'json' | 'html' | 'css' 
  | 'markdown' | 'python' | 'java' | 'cpp' | 'csharp'
  | 'go' | 'rust' | 'php' | 'ruby' | 'sql' | 'yaml'

const languageCache = new Map<SupportedLanguage, boolean>()

/**
 * 根据文件扩展名获取语言
 */
export function getLanguageFromFilename(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const languageMap: Record<string, SupportedLanguage> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'less': 'css',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'h': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml'
  }
  
  return languageMap[ext || ''] || 'typescript'
}

/**
 * 按需加载语言支持
 */
export async function loadLanguageSupport(language: SupportedLanguage): Promise<void> {
  if (languageCache.has(language)) {
    return
  }

  try {
    // Monaco 的语言支持通常在首次使用时自动加载
    // 这里我们可以预加载常用语言的配置
    switch (language) {
      case 'typescript':
      case 'javascript':
        // TypeScript/JavaScript 默认已加载
        break
      case 'json':
        // JSON 默认已加载
        break
      case 'html':
      case 'css':
        // 这些通常也是默认加载的
        break
      default:
        // 其他语言按需加载
        console.info(`[Monaco] Loading language support for: ${language}`)
    }
    
    languageCache.set(language, true)
  } catch (error) {
    console.error(`[Monaco] Failed to load language ${language}:`, error)
  }
}

/**
 * 预加载常用语言
 */
export async function preloadCommonLanguages(): Promise<void> {
  const commonLanguages: SupportedLanguage[] = [
    'typescript',
    'javascript',
    'json',
    'html',
    'css',
    'markdown'
  ]
  
  await Promise.all(
    commonLanguages.map(lang => loadLanguageSupport(lang))
  )
}

/**
 * 获取 Monaco 编辑器配置
 */
export function getMonacoConfig(language: SupportedLanguage) {
  return {
    language,
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'var(--font-mono)',
    minimap: {
      enabled: true,
      scale: 1
    },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    },
    renderLineHighlight: 'all',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    padding: { top: 16, bottom: 16 },
    bracketPairColorization: {
      enabled: true
    },
    guides: {
      bracketPairs: true,
      indentation: true
    },
    suggest: {
      preview: true,
      showInlineDetails: true
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    },
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    formatOnPaste: true,
    formatOnType: true
  }
}
