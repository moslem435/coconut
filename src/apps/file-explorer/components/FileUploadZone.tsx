import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'

interface FileUploadZoneProps {
  targetFolderId: string
  onUploadComplete?: () => void
}

export default function FileUploadZone({ targetFolderId, onUploadComplete }: FileUploadZoneProps) {
  const { createItem } = useFileSystemStore()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const content = await file.arrayBuffer()
        const textContent = new TextDecoder().decode(content)
        await createItem(targetFolderId, file.name, 'file', textContent)
      } catch (error) {
        console.error('Failed to upload file:', file.name, error)
      }
    }
    onUploadComplete?.()
  }, [targetFolderId, createItem, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    noClick: true, // Only activate on drag
  })

  return (
    <div
      {...getRootProps()}
      className={`absolute inset-0 pointer-events-none transition-all duration-200 ${
        isDragActive
          ? 'bg-blue-500/20 backdrop-blur-sm pointer-events-auto'
          : ''
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="h-full flex flex-col items-center justify-center text-white">
          <div className="bg-blue-500/30 p-8 rounded-2xl border-2 border-dashed border-blue-400">
            <Upload size={48} className="mb-4 mx-auto" />
            <p className="text-lg font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}
    </div>
  )
}
