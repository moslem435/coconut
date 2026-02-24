import { useState, useEffect } from 'react'

export interface StorageInfo {
  usage: number
  quota: number
  usagePercent: number
  isLoading: boolean
}

export function useStorageInfo() {
  const [info, setInfo] = useState<StorageInfo>({
    usage: 0,
    quota: 0,
    usagePercent: 0,
    isLoading: true
  })

  useEffect(() => {
    const checkStorage = async () => {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const { usage, quota } = await navigator.storage.estimate()
          
          // Default fallback values if undefined
          const safeUsage = usage || 0
          const safeQuota = quota || (1024 * 1024 * 1024 * 10) // 10GB default fallback

          setInfo({
            usage: safeUsage,
            quota: safeQuota,
            usagePercent: (safeUsage / safeQuota) * 100,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to estimate storage:', error)
          setInfo(prev => ({ ...prev, isLoading: false }))
        }
      } else {
        // Fallback for environments without storage API
        setInfo({
            usage: 24 * 1024 * 1024 * 1024, // 24GB Mock
            quota: 64 * 1024 * 1024 * 1024, // 64GB Mock
            usagePercent: (24/64) * 100,
            isLoading: false
        })
      }
    }

    checkStorage()
    
    // Optional: Poll every 30 seconds
    const interval = setInterval(checkStorage, 30000)
    return () => clearInterval(interval)
  }, [])

  return info
}
