'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface SystemClockProps {
    className?: string
    style?: React.CSSProperties
    showDate?: boolean
}

export default function SystemClock({ className, style, showDate = false }: SystemClockProps) {
    const [time, setTime] = useState("")
    const [date, setDate] = useState("")
    const { language } = useLanguage()

    useEffect(() => {
        let lastTime = ""
        const updateTime = () => {
            const now = new Date()
            const locale = language === 'zh' ? 'zh-CN' : 'en-US'
            
            const newTime = now.toLocaleTimeString(locale, { hour12: false, hour: '2-digit', minute: '2-digit' })

            // Only update state if time actually changed (every minute)
            if (newTime !== lastTime) {
                lastTime = newTime
                setTime(newTime)
            }

            if (showDate) {
                setDate(now.toLocaleDateString(locale, { month: 'short', day: 'numeric' }))
            }
        }
        updateTime()
        const timer = setInterval(updateTime, 1000)
        return () => clearInterval(timer)
    }, [showDate, language])

    if (showDate) {
        return (
            <div className={className} style={style}>
                <span className="font-semibold text-xs" style={{ color: 'var(--os-text-primary)' }}>{time}</span>
                <span className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{date}</span>
            </div>
        )
    }

    return (
        <span className={className} style={{ ...style, color: 'var(--os-text-primary)' }}>{time}</span>
    )
}
