import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { FileStat } from '@/os/kernel/filesystem/IFileSystem'

export interface PreviewContext {
  fileId: string
  name: string
  stat?: FileStat
}

export interface IPreviewProvider {
  id: string
  name: string
  priority: number // Higher wins
  canHandle: (file: FileNode, stat?: FileStat) => boolean
  render: (context: PreviewContext) => React.ReactNode
}

class PreviewServiceImpl {
  private providers: IPreviewProvider[] = []

  register(provider: IPreviewProvider) {
    this.providers.push(provider)
    this.providers.sort((a, b) => b.priority - a.priority)
  }

  getProvider(file: FileNode, stat?: FileStat): IPreviewProvider | undefined {
    return this.providers.find(p => p.canHandle(file, stat))
  }

  canPreview(file: FileNode, stat?: FileStat): boolean {
    return !!this.getProvider(file, stat)
  }
}

export const PreviewService = new PreviewServiceImpl()
