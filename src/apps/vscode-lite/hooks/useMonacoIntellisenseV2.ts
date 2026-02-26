import { useEffect, useRef, useMemo } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { Monaco } from '@monaco-editor/react'

// 防抖工具
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const useMonacoIntellisenseV2 = (monaco: Monaco | null) => {
  const { files, readFileContent } = useFileSystemStore()
  const syncedFilesRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef(false)

  // 只筛选 TS/JS 文件
  const tsJsFiles = useMemo(() => {
    return Object.values(files).filter(f =>
      f.type === 'file' && /\.(ts|tsx|js|jsx|d\.ts)$/.test(f.name)
    )
  }, [files])

  useEffect(() => {
    if (!monaco || isInitializedRef.current) return

    // 配置 TypeScript 编译选项
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      skipLibCheck: true,
      strict: false
    })

    // 配置诊断选项（减少不必要的错误提示）
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2307, // Cannot find module
        2304, // Cannot find name
        7016, // Could not find declaration file
      ]
    })

    isInitializedRef.current = true
  }, [monaco])

  // 增量同步文件
  useEffect(() => {
    if (!monaco) return

    const syncFiles = async () => {
      const currentFileIds = new Set(tsJsFiles.map(f => f.id))
      const syncedIds = syncedFilesRef.current

      // 找出新增的文件
      const newFiles = tsJsFiles.filter(f => !syncedIds.has(f.id))
      
      // 找出删除的文件
      const deletedIds = Array.from(syncedIds).filter(id => !currentFileIds.has(id))

      // 删除已移除的文件模型
      for (const id of deletedIds) {
        const uri = monaco.Uri.parse(`file:///${id}`)
        const model = monaco.editor.getModel(uri)
        if (model) {
          model.dispose()
        }
        syncedIds.delete(id)
      }

      // 添加新文件（批量处理，避免阻塞）
      for (const file of newFiles) {
        try {
          const content = await readFileContent(file.id)
          const uri = monaco.Uri.parse(`file:///${file.id}`)
          
          // 检查模型是否已存在
          const model = monaco.editor.getModel(uri)
          if (!model) {
            // 使用 extraLib 而不是 createModel（更轻量）
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              content,
              uri.toString()
            )
          }
          
          syncedIds.add(file.id)
        } catch (e) {
          console.warn(`Failed to sync file: ${file.name}`, e)
        }
      }
    }

    // 防抖执行，避免频繁触发
    const debouncedSync = debounce(syncFiles, 500)
    debouncedSync()

  }, [monaco, tsJsFiles, readFileContent])
}
