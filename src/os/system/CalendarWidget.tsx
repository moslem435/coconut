'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/os/kernel/LanguageContext'

export default function CalendarWidget() {
  const { t, language } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  
  const [direction, setDirection] = useState(0) // -1 for left, 1 for right

  const { days, monthName, year, currentMonth, currentYear } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthName = currentDate.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long' })

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
      const solar = Solar.fromYmd(year, month + 1, i)
      const lunar = solar.getLunar()

      // Get Holiday info
      const holiday = HolidayUtil.getHoliday(year, month + 1, i)
      const isHoliday = !!holiday
      const isWork = holiday ? holiday.isWork() : false

      // Lunar text priority: Festival > Term > Day
      let lunarText = ''
      
      if (language === 'zh') {
        lunarText = lunar.getDayInChinese()
        const festivals = lunar.getFestivals()
        const solarFestivals = solar.getFestivals()
        const jieQi = lunar.getJieQi()

        if (isHoliday && holiday) {
          lunarText = holiday.getName()
        } else if (festivals.length > 0) {
          lunarText = festivals[0]
        } else if (solarFestivals.length > 0) {
          lunarText = solarFestivals[0]
        } else if (jieQi) {
          lunarText = jieQi
        } else if (lunar.getDay() === 1) {
          lunarText = lunar.getMonthInChinese() + '月'
        }
      }

      days.push({
        day: i,
        type: 'day',
        isToday,
        key: `day-${i}`,
        lunar: lunarText,
        isHoliday,
        isWork,
        gzYear: language === 'zh' ? lunar.getYearInGanZhi() : '',
        gzMonth: language === 'zh' ? lunar.getMonthInGanZhi() : '',
        gzDay: language === 'zh' ? lunar.getDayInGanZhi() : '',
        animal: language === 'zh' ? lunar.getYearShengXiao() : '',
        astro: language === 'zh' ? solar.getXingZuo() : ''
      })
    }

    return { days, monthName, year, currentMonth: month, currentYear: year }
  }, [currentDate, language])

  const prevMonth = () => {
    setDirection(-1)
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setDirection(1)
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  const jumpToToday = () => {
    setDirection(0)
    setCurrentDate(new Date())
  }

  const [selectedDayState, setSelectedDayState] = useState<number | null>(null)

  // Determine active day object
  const activeDay = useMemo(() => {
    // If user manually selected a day in this month, use it
    if (selectedDayState !== null) {
      return days.find(d => d.type === 'day' && d.day === selectedDayState)
    }
    
    // Otherwise default to today if in current month, or first day
    const today = new Date()
    if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
      return days.find(d => d.type === 'day' && d.day === today.getDate())
    }
    
    return days.find(d => d.type === 'day' && d.day === 1)
  }, [days, currentDate, selectedDayState])

  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDayState(null)
  }, [currentMonth, currentYear])



  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0
    })
  }

  // --- Enhanced Info Logic ---
  const [historyEvent, setHistoryEvent] = useState<{ year: string, text: string } | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 1. Lunar & Almanac Info
  const activeDateInfo = useMemo(() => {
    if (!activeDay || typeof activeDay.day !== 'number') return null

    const date = new Date(year, currentMonth, activeDay.day)
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()

    return {
      yi: lunar.getDayYi(),
      ji: lunar.getDayJi(),
      jieqi: lunar.getJieQi(),
      ganzhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
      shengxiao: lunar.getYearShengXiao(),
      astro: solar.getXingZuo()
    }
  }, [activeDay, year, currentMonth])

  // 2. Next Holiday Countdown (From Today)
  const nextHoliday = useMemo(() => {
    const today = new Date()
    // Reset time to start of day for accurate day diff
    today.setHours(0, 0, 0, 0)
    
    let d = new Date(today)
    d.setDate(d.getDate() + 1) // Start looking from tomorrow

    // Look ahead 365 days
    for (let i = 0; i < 365; i++) {
      const h = HolidayUtil.getHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate())
      if (h && !h.isWork()) {
        const diffTime = d.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { name: h.getName(), days: diffDays }
      }
      d.setDate(d.getDate() + 1)
    }
    return null
  }, []) // Only calculate on mount (relative to today)

  // 3. On This Day
  useEffect(() => {
    if (!activeDay || typeof activeDay.day !== 'number') return

    const date = new Date(year, currentMonth, activeDay.day)
    const m = date.getMonth() + 1
    const d = date.getDate()
    
    // Fallback events for offline/error mode
    const fallbacks = [
      { year: '2024', text: 'Welcome to Portfoliio OS' },
      { year: '1969', text: 'Apollo 11 lands on the Moon' },
      { year: '1989', text: 'The World Wide Web is invented' },
      { year: '1995', text: 'JavaScript is released' },
      { year: '2013', text: 'React is open-sourced' }
    ]

    setLoadingHistory(true)
    setHistoryEvent(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

    fetch(`https://history.muffinlabs.com/date/${m}/${d}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data?.data?.Events?.length > 0) {
          // Get a deterministic random event based on year/month/day so it doesn't change on re-render/refresh too crazily
          // Actually random is fine for "discovery"
          const evt = data.data.Events[Math.floor(Math.random() * data.data.Events.length)]
          setHistoryEvent({ year: evt.year, text: evt.text })
        } else {
          setHistoryEvent(fallbacks[d % fallbacks.length])
        }
      })
      .catch(() => {
        // Fallback on error/offline
        setHistoryEvent(fallbacks[d % fallbacks.length])
      })
      .finally(() => {
        clearTimeout(timeoutId)
        setLoadingHistory(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [activeDay, year, currentMonth])

  return (
    <div className="p-4 w-full h-full flex flex-col gap-4">
      {/* Calendar Section */}
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button
              className="font-bold text-base hover:bg-white/10 px-2 py-1 rounded transition-colors"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              {monthName}
            </button>
            <button
              className="font-bold text-base hover:bg-white/10 px-2 py-1 rounded transition-colors"
              onClick={() => setShowYearPicker(!showYearPicker)}
            >
              {year}
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={jumpToToday} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded-full transition-colors text-[var(--os-text-secondary)]" title={t('calendar.today')}>
              <RotateCcw size={14} />
            </button>
            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded-full transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--os-hover-bg)] rounded-full transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d, i) => (
            <div key={i} className={`text-[10px] font-medium uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400/70' : 'text-[var(--os-text-muted)]'}`}>{t(`calendar.week.${d}`)}</div>
          ))}
        </div>

        {/* Days Grid with Animation */}
        <div className="relative overflow-hidden min-h-[220px]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentMonth}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid grid-cols-7 gap-1 text-center w-full"
            >
              {days.map((d) => (
                <div
                  key={d.key}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative group
                    ${d.type === 'padding' ? '' : 'hover:bg-[var(--os-hover-bg)] cursor-pointer border border-transparent hover:border-[var(--os-border)]'}
                    ${d.isToday ? 'bg-[var(--os-accent)] text-[var(--os-accent-contrast)] shadow-lg shadow-[var(--os-accent)]/20 hover:bg-[var(--os-accent)] hover:border-[var(--os-accent)]' : ''}
                    ${d.type === 'day' && activeDay?.day === d.day && !d.isToday ? 'bg-[var(--os-hover-bg)] border-[var(--os-border)]' : ''}
                    ${d.isHoliday && !d.isWork && !d.isToday ? 'text-red-400' : ''}
                    ${d.isWork && !d.isToday ? 'text-[var(--os-text-muted)]' : ''}
                  `}
                  onClick={() => {
                    if (d.type === 'day' && typeof d.day === 'number') {
                      setSelectedDayState(d.day)
                    }
                  }}
                >
                  {d.type !== 'padding' && (
                    <>
                      <span className={`text-sm ${d.isToday ? 'font-bold' : ''}`}>{d.day}</span>
                      <span className={`text-[9px] scale-90 ${d.isToday ? 'opacity-90' : 'opacity-60'} truncate w-full px-0.5`}>{d.lunar}</span>

                      {/* Holiday Badge */}
                      {d.isHoliday && (
                        <div className={`absolute top-0 right-0 text-[8px] leading-none px-1 py-0.5 rounded-bl-lg rounded-tr-lg
                                  ${d.isWork ? 'bg-gray-500/20 text-gray-400' : 'bg-red-500/20 text-red-400'}`}>
                          {d.isWork ? '班' : '休'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--os-border)]/50 w-full" />

      {/* Date Details & Enhanced Info */}
      <div className="flex flex-col pt-2 pb-1 gap-3">
        {/* Header: Date & Lunar */}
        <div className="flex items-baseline justify-between">
             <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--os-text-primary)]">
                    {activeDay ? (language === 'zh' ? `${activeDay.day}日` : `${monthName} ${activeDay.day}`) : ''}
                </span>
                <span className="text-xs text-[var(--os-text-secondary)]">
                    {activeDay ? (
                        language === 'zh' 
                        ? `${activeDay.gzYear}年 ${activeDay.animal} ${activeDay.lunar}` 
                        : `${activeDay.lunar || ''}`
                    ) : ''}
                </span>
             </div>
        </div>

        {/* Enhanced Info Sections */}
        {activeDateInfo && (
           <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
              
              {/* 1. Almanac (Yi/Ji) */}
              {language === 'zh' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                   <div className="bg-green-500/5 p-2 rounded-lg border border-green-500/10 flex flex-col gap-0.5">
                      <span className="text-green-600/80 font-bold text-[10px] uppercase tracking-wider">宜</span>
                      <span className="text-[var(--os-text-secondary)] truncate" title={activeDateInfo.yi.join(' ')}>
                        {activeDateInfo.yi.slice(0, 3).join(' ') || '诸事不宜'}
                      </span>
                   </div>
                   <div className="bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex flex-col gap-0.5">
                      <span className="text-red-600/80 font-bold text-[10px] uppercase tracking-wider">忌</span>
                      <span className="text-[var(--os-text-secondary)] truncate" title={activeDateInfo.ji.join(' ')}>
                        {activeDateInfo.ji.slice(0, 3).join(' ') || '诸事不忌'}
                      </span>
                   </div>
                </div>
              )}

              {/* 3. Solar Term & Ganzhi (More Detail) */}
              <div className="text-xs text-[var(--os-text-secondary)] bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50 flex justify-between items-center">
                  <span>{activeDateInfo.ganzhi}</span>
                  {activeDateInfo.jieqi && (
                    <span className="text-[var(--os-accent)] font-medium bg-[var(--os-accent)]/10 px-1.5 py-0.5 rounded text-[10px]">
                        {activeDateInfo.jieqi}
                    </span>
                  )}
              </div>

              {/* 2. Next Holiday Countdown */}
              {nextHoliday && (
                  <div className="text-xs flex items-center justify-between bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50">
                      <span className="opacity-80">距离 <span className="font-bold text-[var(--os-text-primary)] mx-0.5">{nextHoliday.name}</span> 还有</span>
                      <span className="font-bold text-[var(--os-accent)]">{nextHoliday.days} 天</span>
                  </div>
              )}

              {/* 4. On This Day */}
              <div className="text-xs bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50 min-h-[48px] flex flex-col gap-1 relative overflow-hidden group">
                  <span className="font-bold opacity-50 text-[9px] uppercase tracking-widest flex items-center gap-1">
                    <RotateCcw size={8} /> 
                    {language === 'zh' ? '历史上的今天' : 'On This Day'}
                  </span>
                  {loadingHistory ? (
                      <span className="opacity-50 animate-pulse">Loading...</span>
                  ) : historyEvent ? (
                      <div className="flex gap-2">
                        <span className="font-mono text-[var(--os-accent)] opacity-80 shrink-0">{historyEvent.year}</span>
                        <span className="line-clamp-2 opacity-90 leading-tight" title={historyEvent.text}>{historyEvent.text}</span>
                      </div>
                  ) : (
                      <span className="opacity-50">No events found</span>
                  )}
              </div>
           </div>
        )}
      </div>

      {/* Pickers Overlay (Simplified for brevity, can be expanded) */}
      {(showMonthPicker || showYearPicker) && (
        <div className="absolute inset-0 bg-[var(--os-bg)]/95 backdrop-blur-md z-20 flex flex-col p-4 animate-in fade-in duration-200 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">{showMonthPicker ? t('calendar.select.month') : t('calendar.select.year')}</span>
            <button
              onClick={() => {
                setShowMonthPicker(false)
                setShowYearPicker(false)
              }}
              className="text-[var(--os-text-muted)] hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto content-start">
            {showMonthPicker
              ? Array.from({ length: 12 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentDate(new Date(currentDate.getFullYear(), i, 1))
                      setShowMonthPicker(false)
                    }}
                    className={`p-3 rounded-xl hover:bg-white/10 text-sm font-medium transition-all ${currentMonth === i ? 'bg-[var(--os-accent)] text-white shadow-lg shadow-[var(--os-accent)]/20' : 'bg-[var(--os-bg-base)] border border-[var(--os-border)]'}`}
                  >
                    {new Date(2000, i, 1).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' })}
                  </button>
                ))
              : Array.from({ length: 12 }).map((_, i) => {
                  const y = currentDate.getFullYear() - 5 + i
                  return (
                    <button
                      key={y}
                      onClick={() => {
                        setCurrentDate(new Date(y, currentMonth, 1))
                        setShowYearPicker(false)
                      }}
                      className={`p-3 rounded-xl hover:bg-white/10 text-sm font-medium transition-all ${year === y ? 'bg-[var(--os-accent)] text-white shadow-lg shadow-[var(--os-accent)]/20' : 'bg-[var(--os-bg-base)] border border-[var(--os-border)]'}`}
                    >
                      {y}
                    </button>
                  )
                })}
          </div>
        </div>
      )}
    </div>
  )
}
