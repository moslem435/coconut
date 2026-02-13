import { useEffect, useRef } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { Monaco } from '@monaco-editor/react'

export const useMonacoIntellisense = (monaco: Monaco | null) => {
    const { files, readFileContent } = useFileSystemStore()
    const isInitializedRef = useRef(false)

    useEffect(() => {
        if (!monaco) return

        // 1. Configure Compiler Options
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types']
        })

        // 2. Add React Type Definitions (Basic)
        // In a real app, we might fetch these from a CDN like unpkg or esm.sh
        // For now, we add a minimal definition to avoid excessive red lines for React
        /*
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            `declare module 'react' { ... }`,
            'file:///node_modules/@types/react/index.d.ts'
        )
        */

        // 3. Sync VFS Files to ExtraLib
        // This allows one file to import another and see its types
        const syncFiles = async () => {
            const tsFiles = Object.values(files).filter(f =>
                f.type === 'file' && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.d.ts'))
            )

            for (const file of tsFiles) {
                try {
                    // Logic to read file content. 
                    // Note: readFileContent is async. We should throttle this in a real app.
                    const content = await readFileContent(file.id)
                    // We use the file path as the URI. 
                    // Monaco needs absolute paths like file:///src/components/Button.tsx
                    // But our VFS paths are simple strings. We might need to map them.
                    const path = `file:///${file.name}` // Simplified mapping for flat structure or we need full path resolution

                    // Ideally we should use full paths from store
                    // let's just use fileId or name for now as a test
                    // But import statements use paths...

                    // Creating an in-memory model is better than addExtraLib for "project files"
                    // models allow editing. extraLib is for read-only deps.
                    // BUT, if we use one Editor instance, other files are not "open".
                    // So we must add them as models or extraLib.

                    // If we use models, they might conflict if opened in editor?
                    // Monaco checks if model exists.

                    const uri = monaco.Uri.parse(path)
                    let model = monaco.editor.getModel(uri)

                    if (!model) {
                        model = monaco.editor.createModel(content, undefined, uri)
                    } else {
                        // Update content if changed (and not currently being edited in the active editor?)
                        // This is tricky. synchronization is hard.
                        // For Phase 3 basic, let's just addExtraLib for everything NOT currently open?
                    }

                } catch (e) {
                    console.warn('Failed to sync file to Monaco:', file.name)
                }
            }
        }

        // Run sync
        syncFiles()

        // TODO: Listen to file changes?
        // simple useEffect dependency on [files] might trigger too often.
        // We can optimize later.

    }, [monaco, files, readFileContent])
}
