'use client'

import { useState, useEffect } from 'react'

interface SystemClockProps {
    className?: string
    style?: React.CSSProperties
    showDate?: boolean
}

export default function SystemClock({ className, style, showDate = false }: SystemClockProps) {
    const [time, setTime] = useState("")
    const [date, setDate] = useState("")

    useEffect(() => {
        const updateTime = () => {
            const now = new Date()
            setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
            if (showDate) {
                setDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
            }
        }
        updateTime()
        // Sync to minute change for efficiency if seconds are not displayed? 
        // For now sticking to 1s to be safe and simple, optimization is isolation.
        const timer = setInterval(updateTime, 1000)
        return () => clearInterval(timer)
    }, [showDate])

    if (showDate) {
        return (
            <div className={className} style={style}>
                <span className="font-semibold text-xs" style={{ color: 'var(--os-text-primary)' }}>{time}</span>
                {/* <span className="text-[9px]" style={{ color: 'var(--os-text-muted)' }}>{date}</span> */}
            </div>
        )
    }

    return (
        <span className={className} style={{ ...style, color: 'var(--os-text-primary)' }}>{time}</span>
    )
}
