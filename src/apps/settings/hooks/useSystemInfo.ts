import { useState, useEffect } from 'react'

export function useSystemInfo() {
    const [info, setInfo] = useState({
        browser: 'Unknown',
        resolution: 'Unknown',
        network: 'Checking...'
    })

    useEffect(() => {
        if (typeof window === 'undefined') return

        const nav = navigator as any

        const updateInfo = async () => {
            // Browser & Resolution
            const browser = nav.userAgentData?.brands?.[0]
                ? `${nav.userAgentData.brands[0].brand} ${nav.userAgentData.brands[0].version}`
                : nav.userAgent.split(' ').pop()?.split('/')[0] || 'Browser'

            const resolution = `${window.screen.width} × ${window.screen.height}`

            // Real Network Latency Check
            let networkStatus = 'Offline'
            if (nav.onLine) {
                try {
                    const start = performance.now()
                    await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' })
                    const latency = Math.round(performance.now() - start)
                    networkStatus = `Online (${latency}ms)`
                } catch (e) {
                    networkStatus = 'Online'
                }
            }

            setInfo({
                browser,
                resolution,
                network: networkStatus
            })
        }

        updateInfo()

        // Listen for online/offline events
        window.addEventListener('online', updateInfo)
        window.addEventListener('offline', updateInfo)

        return () => {
            window.removeEventListener('online', updateInfo)
            window.removeEventListener('offline', updateInfo)
        }
    }, [])

    return info
}
