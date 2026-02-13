import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer'

// Import PDF.js worker
import { pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const DocPreview = ({ fileId, name }: { fileId: string, name: string }) => {
    const [docs, setDocs] = useState<{ uri: string; fileName: string; fileType?: string }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let objectUrl: string | null = null
        const load = async () => {
            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if (!path) return

                const buffer = await fs.readFile(path)

                // Determine mime type
                const ext = name.split('.').pop()?.toLowerCase()
                let mimeType = undefined
                if (ext === 'pdf') mimeType = 'application/pdf'
                if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                if (ext === 'csv') mimeType = 'text/csv'

                const blob = new Blob([buffer as any], { type: mimeType })
                objectUrl = URL.createObjectURL(blob)

                setDocs([{
                    uri: objectUrl,
                    fileName: name,
                    fileType: mimeType
                }])
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [fileId, name])

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    if (docs.length === 0) return <div className="p-4 text-white">Failed to load document</div>

    return (
        <div className="h-full w-full bg-white overflow-hidden pt-10">
            <DocViewer
                documents={docs}
                pluginRenderers={DocViewerRenderers}
                config={{
                    header: {
                        disableHeader: false,
                        disableFileName: false,
                        retainURLParams: false
                    },
                    csvDelimiter: ",", // optional
                    pdfZoom: {
                        defaultZoom: 0.8, // 1 as default,
                        zoomJump: 0.2, // 0.1 as default,
                    },
                }}
                style={{ height: '100%' }}
                theme={{
                    primary: "#5296d8",
                    secondary: "#ffffff",
                    tertiary: "#5296d899",
                    textPrimary: "#ffffff",
                    textSecondary: "#5296d8",
                    textTertiary: "#00000099",
                    disableThemeScrollbar: false,
                }}
            />
        </div>
    )
}

export const DocPreviewProvider: IPreviewProvider = {
    id: 'doc-preview',
    name: 'Document Viewer',
    priority: 90, // Higher than default, lower than Image/Video if those are preferred for specific types
    canHandle: (file, stat) => {
        // Office & PDF
        const ext = file.name.split('.').pop()?.toLowerCase()
        return !!(ext && ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'csv'].includes(ext))
    },
    render: (ctx) => <DocPreview fileId={ctx.fileId} name={ctx.name} />
}
