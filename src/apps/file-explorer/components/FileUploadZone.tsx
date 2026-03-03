import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'

interface FileUploadZoneProps {
  targetFolderId: string
  onUploadComplete?: () => void
  children?: React.ReactNode
}

export default function FileUploadZone({ targetFolderId, onUploadComplete, children }: FileUploadZoneProps) {
  const { createItem } = useFileSystemStore()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        let content: string | Uint8Array;
        
        // Simple check for text files
        const isText = /\.(txt|md|json|js|jsx|ts|tsx|css|html|log|xml|ini|conf|gitignore|env)$/i.test(file.name) || 
                       file.type.startsWith('text/') ||
                       file.type === 'application/json' ||
                       file.type === 'application/javascript';

        if (isText) {
          content = await file.text();
        } else {
          const buffer = await file.arrayBuffer();
          content = new Uint8Array(buffer);
        }

        await createItem(targetFolderId, file.name, 'file', content)
      } catch (error) {
        console.error('Failed to upload file:', file.name, error)
      }
    }
    onUploadComplete?.()
  }, [targetFolderId, createItem, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Only activate on drag
  })

  return (
    <div
      {...getRootProps()}
      className="flex-1 flex flex-col min-w-0 bg-transparent relative outline-none"
    >
      <input {...getInputProps()} />
      {children}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none">
          <div className="bg-blue-500/30 p-8 rounded-2xl border-2 border-dashed border-blue-400">
            <Upload size={48} className="mb-4 mx-auto" />
            <p className="text-lg font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}
    </div>
  )
}
