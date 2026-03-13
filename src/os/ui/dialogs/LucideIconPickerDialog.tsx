import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLucideIconPickerStore } from '@/os/kernel/useLucideIconPickerStore'

type LucideEntry = { name: string; Component: any }

const isIconExport = (name: string, value: any) => {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) return false
  if (name === 'default') return false
  if (name === 'createLucideIcon') return false
  if (name === 'Icon') return false
  if (name === 'LucideIcon') return false
  if (name === 'LucideProps') return false
  if (name === 'IconNode') return false
  if (name === 'icons') return false
  if (typeof value === 'function') return true
  if (!value || typeof value !== 'object') return false
  return Boolean((value as any).$$typeof && (value as any).render)
}

export function LucideIconPickerDialog() {
  const request = useLucideIconPickerStore((s) => s.request)
  const close = useLucideIconPickerStore((s) => s.close)
  const [icons, setIcons] = useState<LucideEntry[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>('')
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(960)

  useEffect(() => {
    if (!request) return
    setQuery('')
    setSelected(request.initial || '')
    let disposed = false
    ;(async () => {
      const mod: any = await import('lucide-react')
      if (disposed) return
      const entries = Object.entries(mod)
        .filter(([k, v]) => isIconExport(k, v))
        .map(([k, v]) => ({ name: k, Component: v }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setIcons(entries)
    })()
    return () => {
      disposed = true
    }
  }, [request])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return icons
    return icons.filter((i) => i.name.toLowerCase().includes(q))
  }, [icons, query])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      if (w) setContainerWidth(w)
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth || 960)
    return () => ro.disconnect()
  }, [request])

  const tileW = 128
  const tileH = 112
  const cols = Math.min(7, Math.max(3, Math.floor((containerWidth - 40) / tileW)))
  const rowCount = Math.ceil(filtered.length / cols)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tileH,
    overscan: 8
  })

  useEffect(() => {
    if (!request) return
    if (!request.initial) return
    const idx = filtered.findIndex((i) => i.name === request.initial)
    if (idx >= 0) {
      const row = Math.floor(idx / cols)
      virtualizer.scrollToIndex(row, { align: 'center' })
    }
  }, [request, filtered, virtualizer, cols])

  if (!request) return null

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={() => close(null)}
    >
      <div
        className="w-full max-w-4xl bg-[var(--os-bg-window)]/92 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--os-border)] flex flex-col h-[620px] overflow-hidden text-sm"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-14 border-b border-[var(--os-border)] flex items-center justify-between px-5 bg-[var(--os-bg-panel)]/40">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--os-text-primary)] truncate">
              {request.title || 'Choose Lucide Icon'}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--os-text-secondary)] truncate">
              {selected ? `Selected: ${selected}` : 'Search, preview, and double-click to apply'}
            </div>
          </div>
          <button
            onClick={() => close(null)}
            className="p-2 hover:bg-[var(--os-hover-bg)] rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-[var(--os-text-muted)]" />
          </button>
        </div>

        <div className="h-12 border-b border-[var(--os-border)] flex items-center px-4 gap-3 bg-[var(--os-bg-selection)]/20">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1.5 text-[var(--os-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons..."
              className="w-full h-8 pl-8 pr-2 bg-[var(--os-bg-input)] rounded-lg border border-[var(--os-border)] text-xs focus:outline-none focus:border-[var(--os-accent)] text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)] shadow-sm"
              autoFocus
            />
          </div>
          <div className="h-8 px-2.5 rounded-full bg-[var(--os-bg-panel)]/60 border border-[var(--os-border)] flex items-center text-xs text-[var(--os-text-secondary)] tabular-nums">
            {filtered.length}
          </div>
        </div>

        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((row) => {
              const start = row.index * cols
              const slice = filtered.slice(start, start + cols)
              return (
                <div
                  key={row.key}
                  className="absolute left-0 right-0 px-4"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {slice.map((entry) => {
                      const Icon = entry.Component
                      const isActive = selected === entry.name
                      return (
                        <button
                          key={entry.name}
                          className={`group rounded-xl border text-left px-2.5 py-2.5 transition-colors ${
                            isActive
                              ? 'bg-[var(--os-bg-selection)] border-[var(--os-accent)]/45 shadow-[0_0_0_1px_var(--os-accent-dim)]'
                              : 'bg-[var(--os-bg-panel)]/25 border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] hover:border-[var(--os-border-active)]'
                          }`}
                          style={{ height: tileH }}
                          onClick={() => setSelected(entry.name)}
                          onDoubleClick={() => close(entry.name)}
                          title={entry.name}
                        >
                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
                            isActive
                              ? 'bg-[var(--os-accent-dim)]/20 border-[var(--os-accent)]/35'
                              : 'bg-[var(--os-bg-panel)]/60 border-[var(--os-border)] group-hover:border-[var(--os-border-active)]'
                          }`}>
                            {React.createElement(Icon, { size: 24, strokeWidth: 1.9 })}
                          </div>
                          <div className="mt-2 text-[11px] text-[var(--os-text-primary)] leading-tight line-clamp-2">
                            {entry.name.replace(/([a-z])([A-Z])/g, '$1 $2')}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-16 border-t border-[var(--os-border)] flex items-center px-5 gap-3 bg-[var(--os-bg-panel)]/40">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--os-text-secondary)] truncate">
              {selected ? `lucide:${selected}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => close(null)}
              className="px-4 h-8 text-xs font-medium bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => close(selected || null)}
              disabled={!selected}
              className="px-4 h-8 text-xs font-medium bg-[var(--os-accent)] hover:bg-[var(--os-accent-dim)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
