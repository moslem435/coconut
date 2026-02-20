'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Maximize2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { GalleryItem } from './components/GalleryItem'

export default function PhotoGallery() {
  const { files, getChildren } = useFileSystemStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { t } = useLanguage()

  const getDisplayName = (file: any) => {
    const key = `gallery.image.${file.id}`
    const translated = t(key)
    return translated === key ? file.name : translated
  }

  // Get images from Pictures folder
  // In a real scenario, we'd filter by mime type, but here we assume everything in Pictures is an image
  // or we check if content is a URL
  const picturesFolderId = 'pictures'
  const images = useMemo(() => {
    const children = getChildren(picturesFolderId)
    // Filter for files only
    return children.filter(c => c.type === 'file')
  }, [files, getChildren])

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1
    return images.findIndex(img => img.id === selectedId)
  }, [selectedId, images])

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedIndex < images.length - 1) {
      setSelectedId(images[selectedIndex + 1].id)
    }
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedIndex > 0) {
      setSelectedId(images[selectedIndex - 1].id)
    }
  }

  // Lightbox content loading
  const { getFileBlob } = useFileSystemStore()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    if (selectedId) {
      const img = images.find(i => i.id === selectedId)
      if (img) {
        getFileBlob(img.id).then(blob => {
          if (blob) {
            objectUrl = URL.createObjectURL(blob)
            setLightboxSrc(objectUrl)
          } else {
            setLightboxSrc(null)
          }
        }).catch(() => setLightboxSrc(null))
      }
    } else {
      setLightboxSrc(null)
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedId, images, getFileBlob])

  return (
    <div className="h-full w-full bg-[#111] text-white flex flex-col pt-10">
      {/* Header / Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-[#111]/90 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{t('gallery.library')}</span>
          <span className="text-xs text-white/40">{images.length} {t('gallery.items')}</span>
        </div>
        <div className="flex gap-2">
          {/* Toolbar actions could go here */}
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
            <ImageIcon size={48} className="mb-4 opacity-50" />
            <p>{t('gallery.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <motion.div
                key={img.id}
                layoutId={`img-${img.id}`}
                onClick={() => setSelectedId(img.id)}
                className="aspect-square bg-white/5 rounded-lg overflow-hidden cursor-pointer relative group border border-white/5 hover:border-white/20 transition-colors"
              >
                <GalleryItem file={img} getDisplayName={getDisplayName} />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white drop-shadow-lg" size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md pt-8"
            onClick={() => setSelectedId(null)}
          >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-4 z-50 pt-8">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <button
              onClick={handlePrev}
              disabled={selectedIndex === 0}
              className={`absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50 ${selectedIndex === 0 ? 'hidden' : ''}`}
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              disabled={selectedIndex === images.length - 1}
              className={`absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50 ${selectedIndex === images.length - 1 ? 'hidden' : ''}`}
            >
              <ChevronRight size={24} />
            </button>

            {/* Main Image */}
            <motion.div
              layoutId={`img-${selectedId}`}
              className="relative max-w-[90%] max-h-[85%] rounded overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxSrc ? (
                <img
                  src={lightboxSrc}
                  alt={getDisplayName(images[selectedIndex])}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : (
                <div className="w-[80vw] h-[60vh] flex flex-col items-center justify-center bg-[#222]">
                  <ImageIcon size={64} className="text-white/20 mb-4" />
                  <span className="text-xl text-white/40">{getDisplayName(images[selectedIndex])}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-medium">{getDisplayName(images[selectedIndex])}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
