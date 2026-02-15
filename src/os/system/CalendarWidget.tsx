'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript'
import { useLanguage } from '@/os/kernel/LanguageContext'

export default function CalendarWidget() {
  const { t, language } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)

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

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const jumpToToday = () => setCurrentDate(new Date())

  const [hoveredDay, setHoveredDay] = useState<any>(null)

  // Find today or selected date for default display
  const activeDay = useMemo(() => {
    if (hoveredDay) return hoveredDay
    // Find the day object that matches currentDate
    return days.find(d => d.type === 'day' && d.day === currentDate.getDate()) || days.find(d => d.type === 'day')
  }, [days, currentDate, hoveredDay])

  return (
    <div className="p-4 w-full relative flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            className="font-semibold text-sm hover:bg-white/10 px-2 py-1 rounded transition-colors"
            onClick={() => setShowMonthPicker(!showMonthPicker)}
          >
            {monthName}
          </button>
          <button
            className="font-semibold text-sm hover:bg-white/10 px-2 py-1 rounded transition-colors"
            onClick={() => setShowYearPicker(!showYearPicker)}
          >
            {year}
          </button>
        </div>
        <div className="flex gap-1">
          <button onClick={jumpToToday} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-md transition-colors text-[var(--os-text-secondary)]" title={t('calendar.today')}>
            <RotateCcw size={14} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1 self-center" />
          <button onClick={prevMonth} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-md transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-md transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d, i) => (
          <div key={i} className={`text-[10px] font-medium ${i === 0 || i === 6 ? 'text-red-400/70' : 'text-[var(--os-text-muted)]'}`}>{t(`calendar.week.${d}`)}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center" onMouseLeave={() => setHoveredDay(null)}>
        {days.map((d) => (
          <div
            key={d.key}
            className={`
              h-10 flex flex-col items-center justify-center rounded-lg transition-colors relative group
              ${d.type === 'padding' ? '' : 'hover:bg-[var(--os-hover-bg)] cursor-pointer'}
              ${d.isToday ? 'bg-[var(--os-accent)] text-[var(--os-accent-contrast)] shadow-lg shadow-[var(--os-accent)]/20' : ''}
              ${d.isHoliday && !d.isWork && !d.isToday ? 'text-red-400' : ''}
              ${d.isWork && !d.isToday ? 'text-[var(--os-text-muted)]' : ''}
            `}
            onMouseEnter={() => d.type === 'day' && setHoveredDay(d)}
            onClick={() => {
              if (d.type === 'day' && typeof d.day === 'number') {
                setCurrentDate(new Date(year, currentMonth, d.day))
              }
            }}
          >
            {d.type !== 'padding' && (
              <>
                <span className={`text-xs ${d.isToday ? 'font-bold' : ''}`}>{d.day}</span>
                <span className={`text-[9px] scale-90 ${d.isToday ? 'opacity-90' : 'opacity-60'}`}>{d.lunar}</span>

                {/* Holiday Badge */}
              {d.isHoliday && (
                <div className={`absolute top-0 right-0 text-[8px] leading-none px-0.5 rounded-bl-sm 
                          ${d.isWork ? 'bg-gray-500/20 text-gray-400' : 'bg-red-500/20 text-red-400'}`}>
                  {d.isWork ? t('calendar.holiday.work') : t('calendar.holiday.rest')}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>

    {/* Info Footer */}
    <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/5 min-h-[4.5rem] flex flex-col justify-center">
      {activeDay ? (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--os-accent)]">
              {language === 'zh'
                ? `${year}年${currentMonth + 1}月${activeDay.day}日`
                : `${monthName} ${activeDay.day}, ${year}`}
            </span>
            {activeDay.lunar && <span className="text-xs text-[var(--os-text-primary)]">{activeDay.lunar}</span>}
          </div>
          {language === 'zh' && (
            <div className="flex gap-3 text-[10px] text-[var(--os-text-secondary)]">
              <span>{activeDay.gzYear}年 {activeDay.gzMonth}月 {activeDay.gzDay}日</span>
              <span>{activeDay.animal} · {activeDay.astro}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-xs text-[var(--os-text-muted)]">{t('calendar.select.date')}</div>
      )}
    </div>

      {/* Pickers Overlay */}
      {(showMonthPicker || showYearPicker) && (
        <div className="absolute inset-0 bg-[var(--os-bg)]/95 backdrop-blur-md z-10 flex flex-col p-4 animate-in fade-in duration-200">
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
          <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto">
            {showMonthPicker
              ? Array.from({ length: 12 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentDate(new Date(currentDate.getFullYear(), i, 1))
                      setShowMonthPicker(false)
                    }}
                    className={`p-2 rounded hover:bg-white/10 text-sm ${currentMonth === i ? 'bg-[var(--os-accent)] text-white' : ''}`}
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
                      className={`p-2 rounded hover:bg-white/10 text-sm ${year === y ? 'bg-[var(--os-accent)] text-white' : ''}`}
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
