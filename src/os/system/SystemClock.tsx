'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface SystemClockProps {
    className?: string
    style?: React.CSSProperties
    showDate?: boolean
}

export default function SystemClock({ className, style, showDate = false }: SystemClockProps) {
    const [time, setTime] = useState<string>("")
    const [date, setDate] = useState<string>("")
    const { language } = useLanguage()

    useEffect(() => {
        // Initial set to avoid layout shift if possible, or handle hydration
        const updateTime = () => {
            const now = new Date()
            const locale = language === 'zh' ? 'zh-CN' : 'en-US'

            // Time: 24h format
            const newTime = now.toLocaleTimeString(locale, {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            })
            setTime(newTime)

            if (showDate) {
                // Date: Include weekday
                const newDate = now.toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                })
                setDate(newDate)
            }
        }

        updateTime()
        // Sync with seconds to update at the start of the next minute for precision
        const now = new Date()
        const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50

        let timer: NodeJS.Timeout

        const startInterval = () => {
            updateTime()
            timer = setInterval(updateTime, 60000)
        }

        const initialTimer = setTimeout(() => {
            startInterval()
        }, msUntilNextMinute)

        return () => {
            clearTimeout(initialTimer)
            clearInterval(timer)
        }
    }, [showDate, language])

    // Prevent hydration mismatch by not rendering until client-side (time is set)
    if (!time) return <div className={className} style={{ ...style, width: '40px' }} />

    if (showDate) {
        return (
            <div
                className={`flex flex-col items-center justify-center pointer-events-none ${className}`}
                style={style}
            >
                <span className="text-sm font-medium tabular-nums tracking-wide text-[var(--os-text-primary)]">
                    {time}
                </span>
                <span className="text-[10px] font-medium opacity-70 uppercase tracking-widest text-[var(--os-text-secondary)] mt-0.5 scale-95 origin-center">
                    {date}
                </span>
            </div>
        )
    }

    return (
        <span className={`text-sm font-medium tabular-nums text-[var(--os-text-primary)] ${className}`} style={style}>
            {time}
        </span>
    )
}
