import { useState, useEffect } from 'react'

export function useUptime() {
    const [uptime, setUptime] = useState(0)

    useEffect(() => {
        // Simple session uptime
        const startTime = Date.now()

        const interval = setInterval(() => {
            setUptime(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return formatTime(uptime)
}
