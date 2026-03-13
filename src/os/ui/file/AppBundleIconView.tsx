import React, { useEffect, useMemo, useState } from 'react'
import { FileNode, useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { cn } from '@/lib/utils'
import { eventBus } from '@/os/kernel/EventBus'
import { Globe, Terminal, Cpu } from 'lucide-react'

type Variant = 'list' | 'grid'

type CacheEntry = { url: string; refs: number; version: number }
const blobUrlCache = new Map<string, CacheEntry>()
const blobUrlVersion = new Map<string, number>()

function getBlobVersion(path: string) {
  return blobUrlVersion.get(path) ?? 0
}

function bumpBlobVersion(path: string) {
  blobUrlVersion.set(path, getBlobVersion(path) + 1)
}

function hashToHue(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

function getInitials(name: string) {
  const s = (name || '').trim()
  if (!s) return 'A'
  const compact = s.replace(/\s+/g, ' ')
  const parts = compact.split(' ').filter((p): p is string => Boolean(p))
  const takeChar = (str: string) => Array.from(str)[0] || ''
  if (parts.length >= 2) return (takeChar(parts[0] || '') + takeChar(parts[1] || '')).toUpperCase()
  const chars = Array.from(compact.replace(/[^0-9A-Za-z\u4e00-\u9fff]/g, ''))
  if (chars.length >= 2) return ((chars[0] || '') + (chars[1] || '')).toUpperCase()
  return (chars[0] || takeChar(compact) || 'A').toUpperCase()
}

function normalizeIconPath(icon: string, basePath: string) {
  if (!icon) return null
  if (/^https?:\/\//i.test(icon) || /^data:image\//i.test(icon)) return icon
  if (icon.startsWith('/')) return icon
  if (icon.startsWith('./')) {
    const rel = icon.slice(2)
    return `${basePath.replace(/\/$/, '')}/${rel}`.replace(/\/+/g, '/')
  }
  if (icon.startsWith('../')) {
    let rel = icon
    let base = basePath.replace(/\/$/, '')
    while (rel.startsWith('../')) {
      rel = rel.slice(3)
      const idx = base.lastIndexOf('/')
      base = idx > 0 ? base.slice(0, idx) : ''
    }
    return `${base}/${rel}`.replace(/\/+/g, '/')
  }
  if (!icon.includes('/') && !icon.includes(':')) {
    return `${basePath.replace(/\/$/, '')}/${icon}`.replace(/\/+/g, '/')
  }
  return null
}

function looksLikeEmoji(icon: string) {
  const s = (icon || '').trim()
  if (!s) return false
  if (s.length > 12) return false
  if (s.startsWith('lucide:')) return false
  if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s) || s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return false
  const chars = Array.from(s)
  return chars.length <= 3
}

function normalizeLucideName(raw: string) {
  const s = (raw || '').trim()
  if (!s) return ''
  const base = s.replace(/^lucide:/i, '')
  if (!base) return ''
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(base)) return (base[0] || '').toUpperCase() + base.slice(1)
  const parts = base.split(/[^A-Za-z0-9]+/).filter(Boolean)
  return parts.map(p => (p[0] || '').toUpperCase() + p.slice(1)).join('')
}

function mimeFromPath(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'svg':
      return 'image/svg+xml'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'ico':
      return 'image/x-icon'
    default:
      return ''
  }
}

export function AppBundleIconView({
  item,
  size,
  selected,
  variant,
  className
}: {
  item: FileNode
  size: number
  selected?: boolean
  variant: Variant
  className?: string
}) {
  const displayName = item.name.replace(/\.app$/, '')
  const iconSpec = (item.appConfig?.icon || '').trim()
  const basePath = useMemo(() => useFileSystemStore.getState().resolvePath(item.id) || '', [item.id])
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [rev, setRev] = useState(0)
  const [lucideIcon, setLucideIcon] = useState<any>(null)

  const iconPath = useMemo(() => normalizeIconPath(iconSpec, basePath), [iconSpec, basePath])
  const lucideName = useMemo(() => normalizeLucideName(iconSpec), [iconSpec])
  const isEmoji = useMemo(() => looksLikeEmoji(iconSpec), [iconSpec])

  const hue = useMemo(() => hashToHue(item.id || displayName || 'app'), [item.id, displayName])
  const gradient = useMemo(
    () => `linear-gradient(135deg, hsl(${hue} 85% 55%), hsl(${(hue + 48) % 360} 85% 55%))`,
    [hue]
  )

  useEffect(() => {
    let disposed = false
    setLucideIcon(null)
    if (!lucideName) return
    ;(async () => {
      try {
        const mod: any = await import('lucide-react')
        const Icon = mod?.[lucideName] || mod?.default?.[lucideName]
        if (!disposed) setLucideIcon(Icon || null)
      } catch {
        if (!disposed) setLucideIcon(null)
      }
    })()
    return () => {
      disposed = true
    }
  }, [lucideName])

  useEffect(() => {
    let disposed = false
    let localUrl: string | null = null
    let cacheKey: string | null = null
    let usedCache = false

    const load = async () => {
      if (lucideName) {
        setResolvedUrl(null)
        return
      }
      if (!iconPath || /^https?:\/\//i.test(iconPath) || /^data:image\//i.test(iconPath)) {
        setResolvedUrl(iconPath)
        return
      }
      cacheKey = iconPath
      const desiredVersion = getBlobVersion(iconPath)
      const cached = blobUrlCache.get(iconPath)
      if (cached && cached.version === desiredVersion) {
        cached.refs += 1
        usedCache = true
        if (!disposed) setResolvedUrl(cached.url)
        return
      }
      try {
        const blob = await fs.getFileBlob(iconPath)
        const nextUrl = URL.createObjectURL(blob)
        if (disposed) {
          URL.revokeObjectURL(nextUrl)
          return
        }

        if (!cached || cached.refs === 0) {
          if (cached?.url) URL.revokeObjectURL(cached.url)
          blobUrlCache.set(iconPath, { url: nextUrl, refs: 1, version: desiredVersion })
          usedCache = true
          setResolvedUrl(nextUrl)
          return
        }

        localUrl = nextUrl
        setResolvedUrl(nextUrl)
      } catch {
        try {
          const store = useFileSystemStore.getState()
          const node = store.getNodeByPath(iconPath)
          const text =
            node && typeof (store.files as any)?.[node.id]?.content === 'string'
              ? (store.files as any)[node.id].content
              : node
                ? await store.readFileContent(node.id)
                : ''
          if (!text) throw new Error('empty')
          const nextBlob = new Blob([text], { type: mimeFromPath(iconPath) || 'application/octet-stream' })
          const nextUrl = URL.createObjectURL(nextBlob)
          if (disposed) {
            URL.revokeObjectURL(nextUrl)
            return
          }
          const desiredVersion2 = getBlobVersion(iconPath)
          const cached2 = blobUrlCache.get(iconPath)
          if (!cached2 || cached2.refs === 0) {
            if (cached2?.url) URL.revokeObjectURL(cached2.url)
            blobUrlCache.set(iconPath, { url: nextUrl, refs: 1, version: desiredVersion2 })
            usedCache = true
            setResolvedUrl(nextUrl)
            return
          }
          localUrl = nextUrl
          setResolvedUrl(nextUrl)
        } catch {
          if (!disposed) setResolvedUrl(null)
        }
      }
    }

    void load()
    return () => {
      disposed = true
      if (usedCache && cacheKey) {
        const entry = blobUrlCache.get(cacheKey)
        if (entry) {
          entry.refs -= 1
          if (entry.refs <= 0) {
            URL.revokeObjectURL(entry.url)
            blobUrlCache.delete(cacheKey)
          }
        }
      }
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [iconPath, rev, lucideName])

  useEffect(() => {
    if (!iconPath || /^https?:\/\//i.test(iconPath) || /^data:image\//i.test(iconPath)) return
    const sub1 = eventBus.on('fs:file:updated', (e) => {
      if (e.path !== iconPath) return
      bumpBlobVersion(iconPath)
      setResolvedUrl(null)
      setRev((v) => v + 1)
    })
    const sub2 = eventBus.on('fs:file:renamed', (e) => {
      if (e.oldPath !== iconPath && e.newPath !== iconPath) return
      bumpBlobVersion(iconPath)
      setResolvedUrl(null)
      setRev((v) => v + 1)
    })
    const sub3 = eventBus.on('fs:file:deleted', (e) => {
      if (e.path !== iconPath) return
      bumpBlobVersion(iconPath)
      setResolvedUrl(null)
      setRev((v) => v + 1)
    })
    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
      sub3.unsubscribe()
    }
  }, [iconPath])

  const rounded = variant === 'grid' ? 'rounded-xl' : 'rounded-md'
  const shadow = variant === 'grid' ? 'shadow-md' : 'shadow-sm'
  const scale = selected ? 'scale-105' : ''

  const badgeInfo = useMemo(() => {
    const type = item.appConfig?.type
    switch (type) {
      case 'web-static':
        return { Icon: Globe, bg: 'bg-emerald-500', title: 'Static App' }
      case 'web-container':
      case 'web-app':
        return { Icon: Terminal, bg: 'bg-orange-500', title: 'Node.js App' }
      default:
        return null
    }
  }, [item.appConfig?.type])

  return (
    <div
      className={cn(`relative transition-transform duration-200`, scale, className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(`absolute inset-0 flex items-center justify-center overflow-hidden ${rounded} ${shadow}`)}
        style={{ background: gradient, color: '#ffffff' }}
      >
        {lucideName && lucideIcon ? (
          React.createElement(lucideIcon, { size: Math.round(size * 0.62), strokeWidth: 1.8, color: '#ffffff' })
        ) : resolvedUrl ? (
          <img src={resolvedUrl} alt="" className="w-full h-full object-cover" draggable={false} onError={() => setResolvedUrl(null)} />
        ) : isEmoji ? (
          <span style={{ fontSize: size * 0.72, lineHeight: 1 }}>{iconSpec}</span>
        ) : (
          <span className="font-semibold tracking-wide" style={{ fontSize: size * 0.38, lineHeight: 1 }}>
            {getInitials(displayName)}
          </span>
        )}
      </div>

      {badgeInfo && (
        <div
          className={cn(
            "absolute flex items-center justify-center rounded-full shadow-sm border border-white/20 text-white z-10",
            badgeInfo.bg,
            variant === 'grid' ? "-bottom-1 -right-1 w-5 h-5" : "-bottom-0.5 -right-0.5 w-3 h-3"
          )}
          title={badgeInfo.title}
        >
          <badgeInfo.Icon size={variant === 'grid' ? 12 : 8} strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
