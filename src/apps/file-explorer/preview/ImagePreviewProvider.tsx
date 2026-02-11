import React from 'react'
import { IPreviewProvider } from '@/os/services/PreviewService'
import ImageViewer from '../components/ImageViewer'

export const ImagePreviewProvider: IPreviewProvider = {
  id: 'image-preview',
  name: 'Image Viewer',
  priority: 100,
  canHandle: (file, stat) => {
    // Check mime type if available
    if (stat?.mimeType?.startsWith('image/')) return true
    
    // Fallback to extension check
    return /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)$/i.test(file.name)
  },
  render: (ctx) => <ImageViewer fileId={ctx.fileId} />
}
