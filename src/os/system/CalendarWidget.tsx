'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const { days, monthName, year } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthName = currentDate.toLocaleString('default', { month: 'long' })
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    
    // Padding for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ day: '', type: 'padding', key: `pre-${i}` })
    }
    
    // Days of the month
    const today = new Date()
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear()
      days.push({ day: i, type: 'day', isToday, key: `day-${i}` })
    }
    
    return { days, monthName, year }
  }, [currentDate])

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  return (
    <div className="p-4 bg-[var(--os-bg-base)] rounded-xl border border-[var(--os-border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{monthName} {year}</h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-md transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-md transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-[var(--os-text-muted)] font-medium">{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <div 
            key={d.key} 
            className={`
              h-8 flex items-center justify-center text-xs rounded-lg transition-colors
              ${d.type === 'padding' ? '' : 'hover:bg-[var(--os-hover-bg)] cursor-pointer'}
              ${d.isToday ? 'bg-[var(--os-accent)] text-[var(--os-accent-contrast)] font-bold shadow-lg shadow-[var(--os-accent)]/20' : ''}
            `}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  )
}
