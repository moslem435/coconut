import { useCallback, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { useWindowStore } from '@/os/kernel/useWindowStore'

export function useWindowSnapshot(id: string) {
    const setSnapshot = useWindowStore(state => state.setSnapshot)
    const isSnapshottingRef = useRef(false)
    const lastSnapshotTimeRef = useRef(0)

    // Minimum time between auto-snapshots (ms)
    const SNAPSHOT_COOLDOWN = 5000

    const captureSnapshot = useCallback(async (force = false) => {
        // Prevent concurrent snapshots
        if (isSnapshottingRef.current) return

        // Rate limiting for auto snapshots
        if (!force && Date.now() - lastSnapshotTimeRef.current < SNAPSHOT_COOLDOWN) {
            return
        }

        const el = document.getElementById(`window-${id}`)
        if (!el) return

        try {
            isSnapshottingRef.current = true

            // Use requestIdleCallback if available, otherwise setTimeout
            const scheduler = (window as any).requestIdleCallback || setTimeout

            scheduler(async () => {
                try {
                    // Double check element existence
                    const currentEl = document.getElementById(`window-${id}`)
                    if (!currentEl) {
                        isSnapshottingRef.current = false
                        return
                    }

                    const dataUrl = await toPng(currentEl, {
                        cacheBust: true,
                        pixelRatio: 0.4, // Reduced quality for performance
                        skipAutoScale: true,
                        style: {
                            transform: 'none',
                            transition: 'none',
                            boxShadow: 'none' // Remove shadow for clean snapshot
                        }
                    })

                    setSnapshot(id, dataUrl)
                    lastSnapshotTimeRef.current = Date.now()
                } catch (err) {
                    // Fail silently
                } finally {
                    isSnapshottingRef.current = false
                }
            })
        } catch (e) {
            isSnapshottingRef.current = false
        }
    }, [id, setSnapshot])

    return { captureSnapshot }
}
