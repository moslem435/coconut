// 按需加载 Prettier

type ParserType = 'typescript' | 'babel' | 'css' | 'html' | 'markdown'
type Plugin = unknown

const parserCache = new Map<ParserType, unknown>()

export async function formatCode(
  code: string,
  fileName: string
): Promise<string> {
  // 动态导入 Prettier
  const { format } = await import('prettier/standalone')
  
  // 根据文件扩展名确定 parser
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
    plugins = parserCache.get('typescript')!
  } else if (ext === 'js' || ext === 'jsx') {
    parser = 'babel'
    if (!parserCache.has('babel')) {
      const [parserBabel, parserEstree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree')
      ])
      parserCache.set('babel', [parserBabel, parserEstree])
    }
    plugins = parserCache.get('babel')!
  } else if (ext === 'css' || ext === 'scss') {
    parser = 'css'
    if (!parserCache.has('css')) {
      const parserCSS = await import('prettier/plugins/postcss')
      parserCache.set('css', [parserCSS])
    }
    plugins = parserCache.get('css')!
  } else if (ext === 'html') {
    parser = 'html'
    if (!parserCache.has('html')) {
      const parserHTML = await import('prettier/plugins/html')
      parserCache.set('html', [parserHTML])
    }
    plugins = parserCache.get('html')!
  } else if (ext === 'md') {
    parser = 'markdown'
    if (!parserCache.has('markdown')) {
      const parserMD = await import('prettier/plugins/markdown')
      parserCache.set('markdown', [parserMD])
    }
    plugins = parserCache.get('markdown')!
  }

  if (!parser) {
    throw new Error(`Unsupported file type: ${ext}`)
  }

  return format(code, {
    parser,
    plugins,
    singleQuote: true,
    semi: false,
    printWidth: 100,
    tabWidth: 2,
    trailingComma: 'es5'
  })
}
