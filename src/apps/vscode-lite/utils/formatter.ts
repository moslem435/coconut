/**
 * 代码格式化工具
 * 
 * 功能：
 * - 使用 Prettier 格式化多种语言的代码
 * - 按需加载解析器插件，减少初始加载体积
 * - 缓存已加载的解析器，避免重复加载
 * 
 * 支持的语言：
 * - TypeScript / JavaScript (tsx, ts, jsx, js)
 * - CSS / SCSS
 * - HTML
 * - Markdown
 * 
 * @author System
 * @created 2024
 */

type ParserType = 'typescript' | 'babel' | 'css' | 'html' | 'markdown'
type Plugin = any

/** 解析器插件缓存，避免重复加载 */
const parserCache = new Map<ParserType, unknown>()

/**
 * 格式化代码
 * 
 * 根据文件扩展名自动选择合适的解析器，使用 Prettier 进行格式化。
 * 解析器插件采用懒加载策略，首次使用时加载并缓存。
 * 
 * @param code - 待格式化的代码字符串
 * @param fileName - 文件名（用于推断语言类型）
 * @returns 格式化后的代码
 * @throws {Error} 不支持的文件类型
 * 
 * @example
 * ```typescript
 * const formatted = await formatCode('const x=1;', 'test.ts')
 * // 返回: 'const x = 1\n'
 * ```
 */
export async function formatCode(
  code: string,
  fileName: string
): Promise<string> {
  // 动态导入 Prettier 核心库
  const { format } = await import('prettier/standalone')

  // 根据文件扩展名确定解析器类型
  const ext = fileName.split('.').pop()?.toLowerCase()
  let parser: ParserType | undefined
  let plugins: Array<Plugin> = []

  if (ext === 'ts' || ext === 'tsx') {
    parser = 'typescript'
    if (!parserCache.has('typescript')) {
      const [parserTS, parserEstree] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree')
      ])
      parserCache.set('typescript', [parserTS, parserEstree])
    }
    plugins = parserCache.get('typescript') as Array<Plugin>
  } else if (ext === 'js' || ext === 'jsx') {
    parser = 'babel'
    if (!parserCache.has('babel')) {
      const [parserBabel, parserEstree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree')
      ])
      parserCache.set('babel', [parserBabel, parserEstree])
    }
    plugins = parserCache.get('babel') as Array<Plugin>
  } else if (ext === 'css' || ext === 'scss') {
    parser = 'css'
    if (!parserCache.has('css')) {
      const parserCSS = await import('prettier/plugins/postcss')
      parserCache.set('css', [parserCSS])
    }
    plugins = parserCache.get('css') as Array<Plugin>
  } else if (ext === 'html') {
    parser = 'html'
    if (!parserCache.has('html')) {
      const parserHTML = await import('prettier/plugins/html')
      parserCache.set('html', [parserHTML])
    }
    plugins = parserCache.get('html') as Array<Plugin>
  } else if (ext === 'md') {
    parser = 'markdown'
    if (!parserCache.has('markdown')) {
      const parserMD = await import('prettier/plugins/markdown')
      parserCache.set('markdown', [parserMD])
    }
    plugins = parserCache.get('markdown') as Array<Plugin>
  }

  // 不支持的文件类型
  if (!parser) {
    throw new Error(`Unsupported file type: ${ext}`)
  }

  // 执行格式化
  return format(code, {
    parser,
    plugins,
    singleQuote: true,      // 使用单引号
    semi: false,            // 不使用分号
    printWidth: 100,        // 每行最大字符数
    tabWidth: 2,            // 缩进宽度
    trailingComma: 'es5'    // 尾随逗号（ES5 兼容）
  })
}
