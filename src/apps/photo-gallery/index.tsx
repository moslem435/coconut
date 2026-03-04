'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Maximize2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { eventBus } from '@/os/kernel/EventBus'
import { GalleryItem } from './components/GalleryItem'
import { FILE_IDS } from '@/os/config/paths'

export default function PhotoGallery() {
  const { files, getChildren, loadFolderContent } = useFileSystemStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { t } = useLanguage()

  // Load virtual "All Pictures" folder on mount
  useEffect(() => {
      const virtualPicturesNode = files[FILE_IDS.VIRTUAL_ALL_PICTURES]
      if (virtualPicturesNode) {
          loadFolderContent(FILE_IDS.VIRTUAL_ALL_PICTURES)
      }
  }, [files, loadFolderContent])

  // Listen for file system changes and refresh
  useEffect(() => {
    const handleFileChange = () => {
      // Refresh virtual pictures folder when files change
      const virtualPicturesNode = files[FILE_IDS.VIRTUAL_ALL_PICTURES]
      if (virtualPicturesNode) {
        loadFolderContent(FILE_IDS.VIRTUAL_ALL_PICTURES)
      }
    }

    // Subscribe to file system events
    const unsubscribeCreated = eventBus.on('fs:file:created', handleFileChange)
    const unsubscribeDeleted = eventBus.on('fs:file:deleted', handleFileChange)
    const unsubscribeUpdated = eventBus.on('fs:file:updated', handleFileChange)

    return () => {
      unsubscribeCreated.unsubscribe()
      unsubscribeDeleted.unsubscribe()
      unsubscribeUpdated.unsubscribe()
    }
  }, [files, loadFolderContent])

  const getDisplayName = (file: any) => {
    const key = `gallery.image.${file.id}`
    const translated = t(key)
    return translated === key ? file.name : translated
  }

  // Get images from virtual "All Pictures" folder
  const images = useMemo(() => {
    const virtualPicturesNode = files[FILE_IDS.VIRTUAL_ALL_PICTURES]
    if (virtualPicturesNode) {
        return getChildren(FILE_IDS.VIRTUAL_ALL_PICTURES).filter(c => c.type === 'file')
    }
    
    // Fallback: Get from Pictures folder only
    return getChildren(FILE_IDS.PICTURES).filter(c => c.type === 'file')
  }, [files, getChildren])

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1
    return images.findIndex(img => img.id === selectedId)
  }, [selectedId, images])

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedIndex < images.length - 1) {
      setSelectedId(images[selectedIndex + 1]?.id || null)
    }
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedIndex > 0) {
      setSelectedId(images[selectedIndex - 1]?.id || null)
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
    <div className="h-full w-full bg-[var(--os-bg-window)] text-[var(--os-text-primary)] flex flex-col pt-10">
      {/* Header / Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--os-border)] bg-[var(--os-bg-panel)]/90 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{t('gallery.library')}</span>
          <span className="text-xs text-[var(--os-text-muted)]">{images.length} {t('gallery.items')}</span>
        </div>
        <div className="flex gap-2">
          {/* Toolbar actions could go here */}
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]">
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
                className="aspect-square bg-[var(--os-bg-selection)] rounded-lg overflow-hidden cursor-pointer relative group border border-[var(--os-border)] hover:border-[var(--os-border-active)] transition-colors"
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
            className="absolute inset-0 z-50 bg-[var(--os-bg-window)]/95 flex items-center justify-center backdrop-blur-md pt-8"
            onClick={() => setSelectedId(null)}
          >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-4 z-50 pt-8">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                className="p-2 bg-[var(--os-bg-selection)] rounded-full hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <button
              onClick={handlePrev}
              disabled={selectedIndex === 0}
              className={`absolute left-4 p-3 rounded-full bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50 ${selectedIndex === 0 ? 'hidden' : ''}`}
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              disabled={selectedIndex === images.length - 1}
              className={`absolute right-4 p-3 rounded-full bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50 ${selectedIndex === images.length - 1 ? 'hidden' : ''}`}
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
                  alt={getDisplayName(images[selectedIndex] || { id: 'unknown' })}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : (
                <div className="w-[80vw] h-[60vh] flex flex-col items-center justify-center bg-[var(--os-bg-base)]">
                  <ImageIcon size={64} className="text-[var(--os-text-muted)] mb-4" />
                  <span className="text-xl text-[var(--os-text-muted)]">{getDisplayName(images[selectedIndex] || { id: 'unknown' })}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-medium">{getDisplayName(images[selectedIndex] || { id: 'unknown' })}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
