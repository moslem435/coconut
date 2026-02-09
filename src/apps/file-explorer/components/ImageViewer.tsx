
import { useState } from 'react'

interface ImageViewerProps {
    src: string
    alt?: string
}

export default function ImageViewer({ src, alt = 'Image' }: ImageViewerProps) {
    return (
        <div className="h-full flex items-center justify-center bg-black/90 overflow-hidden">
            <img 
                src={src} 
                alt={alt}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
            />
        </div>
    )
}
