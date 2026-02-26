'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/os/kernel/LanguageContext'

const zodiacMap: Record<string, string> = {
  '白羊': 'Aries', '金牛': 'Taurus', '双子': 'Gemini', '巨蟹': 'Cancer',
  '狮子': 'Leo', '处女': 'Virgo', '天秤': 'Libra', '天蝎': 'Scorpio',
  '射手': 'Sagittarius', '摩羯': 'Capricorn', '水瓶': 'Aquarius', '双鱼': 'Pisces'
}

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
          lunarText = festivals[0]!
        } else if (solarFestivals.length > 0) {
          lunarText = solarFestivals[0]!
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
  const historyCache = useRef<Record<string, { year: string, text: string }>>({})

  // 1. Lunar & Almanac Info
  const activeDateInfo = useMemo(() => {
    if (!activeDay || typeof activeDay.day !== 'number') return null

    const date = new Date(year, currentMonth, activeDay.day)
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()
    const xz = solar.getXingZuo()

    return {
      yi: (lunar as any).getDayYi() as string[],
      ji: (lunar as any).getDayJi() as string[],
      jieqi: lunar.getJieQi(),
      ganzhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
      shengxiao: lunar.getYearShengXiao(),
      astro: language === 'zh' ? `${xz}座` : (zodiacMap[xz] || xz)
    }
  }, [activeDay, year, currentMonth, language])

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
    const cacheKey = `${m}-${d}`

    // Fallback events for offline/error mode
    const fallbacks = language === 'zh' ? [
      { year: '2024', text: '欢迎使用 Portfoliio OS' },
      { year: '1949', text: '中华人民共和国成立' },
      { year: '1978', text: '十一届三中全会召开，改革开放开始' },
      { year: '2008', text: '北京奥运会成功举办' },
      { year: '2022', text: '北京冬奥会成功举办' },
      { year: '1970', text: '中国第一颗人造卫星“东方红一号”发射成功' },
      { year: '2003', text: '神舟五号载人飞船发射成功' },
      { year: '1997', text: '香港回归祖国' },
      { year: '1999', text: '澳门回归祖国' },
      { year: '1919', text: '五四运动爆发' },
      { year: '1911', text: '辛亥革命爆发' },
      { year: '1905', text: '中国同盟会成立' },
      { year: '1984', text: '许海峰获得中国奥运首金' },
      { year: '1998', text: '腾讯公司成立' },
      { year: '1999', text: '阿里巴巴集团成立' },
      { year: '2011', text: '微信发布' },
      { year: '2012', text: '莫言获得诺贝尔文学奖' },
      { year: '2015', text: '屠呦呦获得诺贝尔生理学或医学奖' },
      { year: '2020', text: '嫦娥五号携带月球样品返回地球' }
    ] : [
      { year: '2024', text: 'Welcome to Portfoliio OS' },
      { year: '1969', text: 'Apollo 11 lands on the Moon' },
      { year: '1989', text: 'The World Wide Web is invented' },
      { year: '1995', text: 'JavaScript is released' },
      { year: '2013', text: 'React is open-sourced' },
      { year: '1969', text: 'ARPANET sends its first message' },
      { year: '1983', text: 'Internet Protocol (TCP/IP) becomes standard' },
      { year: '1991', text: 'Linux kernel is released' },
      { year: '1998', text: 'Google is founded' },
      { year: '2007', text: 'First iPhone is released' },
      { year: '2008', text: 'Bitcoin whitepaper is published' },
      { year: '1958', text: 'NASA is established' },
      { year: '1976', text: 'Apple is founded' },
      { year: '1994', text: 'Amazon is founded' },
      { year: '2004', text: 'Facebook is founded' },
      { year: '2006', text: 'Twitter is founded' },
      { year: '1971', text: 'First email is sent' },
      { year: '1984', text: 'Macintosh is released' },
      { year: '1993', text: 'Mosaic browser is released' },
      { year: '2001', text: 'Wikipedia is launched' }
    ]

    // Check cache first to avoid flicker
    if (historyCache.current[cacheKey]) {
      setHistoryEvent(historyCache.current[cacheKey])
      setLoadingHistory(false)
      return
    }

    setLoadingHistory(true)
    setHistoryEvent(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

    const fetchHistory = async () => {
      try {
        let evt = null

        if (language === 'zh') {
          // Chinese: Fetch from local API route (proxies to Baidu Baike)
          // Baidu format: { "01": { "0101": [{ year: "1912", title: "...", ... }] } }
          const monthStr = m.toString().padStart(2, '0')
          const dayStr = d.toString().padStart(2, '0')
          const dateKey = `${monthStr}${dayStr}`

          const response = await fetch(
            `/api/history?month=${monthStr}`,
            { signal: controller.signal }
          )

          if (!response.ok) throw new Error('Network response was not ok')

          const data = await response.json()
          // API returns { "01": { ... } }
          const monthData = data[monthStr]
          const events = monthData?.[dateKey]

          if (events && events.length > 0) {
            // Filter out events without year or title
            const validEvents = events.filter((e: any) => e.year && e.title)
            if (validEvents.length > 0) {
              const randomEvt = validEvents[Math.floor(Math.random() * validEvents.length)]
              // Remove HTML tags from title if any (Baidu sometimes includes links)
              const cleanTitle = randomEvt.title.replace(/<[^>]*>?/gm, '')
              evt = { year: randomEvt.year.replace(/年$/, ''), text: cleanTitle }
            }
          }
        } else {
          // English: Fetch from MuffinLabs
          const response = await fetch(`https://history.muffinlabs.com/date/${m}/${d}`, { signal: controller.signal })
          if (!response.ok) throw new Error('Network response was not ok')

          const data = await response.json()
          if (data?.data?.Events?.length > 0) {
            const rawEvt = data.data.Events[Math.floor(Math.random() * data.data.Events.length)]
            evt = { year: rawEvt.year, text: rawEvt.text }
          }
        }

        if (evt) {
          // Update state and cache
          historyCache.current[cacheKey] = evt as { year: string, text: string }
          setHistoryEvent(evt as { year: string, text: string })
        } else {
          // Fallback if no event was fetched
          const fallbackEvt = fallbacks[d % fallbacks.length]!
          historyCache.current[cacheKey] = fallbackEvt
          setHistoryEvent(fallbackEvt)
        }
      } catch (error) {
        // Fallback on error/offline
        const fallbackEvt = fallbacks[d % fallbacks.length]!
        historyCache.current[cacheKey] = fallbackEvt
        setHistoryEvent(fallbackEvt)
      } finally {
        clearTimeout(timeoutId)
        setLoadingHistory(false)
      }
    }

    fetchHistory()

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [activeDay, year, currentMonth, language])

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
                          {d.isWork ? t('calendar.holiday.work') : t('calendar.holiday.rest')}
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
          <div className="flex flex-col gap-2">

            {/* 1. Almanac (Yi/Ji) - Chinese Only */}
            {language === 'zh' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-500/5 p-2 rounded-lg border border-green-500/10 flex flex-col gap-0.5">
                  <span className="text-green-600/80 font-bold text-[10px] uppercase tracking-wider">{t('calendar.almanac.yi')}</span>
                  <span className="text-[var(--os-text-secondary)] truncate" title={activeDateInfo.yi.join(' ')}>
                    {activeDateInfo.yi.slice(0, 3).join(' ') || t('calendar.almanac.yi.none')}
                  </span>
                </div>
                <div className="bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex flex-col gap-0.5">
                  <span className="text-red-600/80 font-bold text-[10px] uppercase tracking-wider">{t('calendar.almanac.ji')}</span>
                  <span className="text-[var(--os-text-secondary)] truncate" title={activeDateInfo.ji.join(' ')}>
                    {activeDateInfo.ji.slice(0, 3).join(' ') || t('calendar.almanac.ji.none')}
                  </span>
                </div>
              </div>
            )}

            {/* 3. Solar Term & Ganzhi (or Zodiac for EN) */}
            <div className="text-xs text-[var(--os-text-secondary)] bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50 flex justify-between items-center">
              <span>
                {language === 'zh' ? activeDateInfo.ganzhi : activeDateInfo.astro}
              </span>
              {language === 'zh' && activeDateInfo.jieqi && (
                <span className="text-[var(--os-accent)] font-medium bg-[var(--os-accent)]/10 px-1.5 py-0.5 rounded text-[10px]">
                  {activeDateInfo.jieqi}
                </span>
              )}
            </div>

            {/* 2. Next Holiday Countdown (Chinese Only for now as names are ZH) */}
            {language === 'zh' && nextHoliday && (
              <div className="text-xs flex items-center justify-between bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50">
                <span className="opacity-80">{t('calendar.holiday.prefix')} <span className="font-bold text-[var(--os-text-primary)] mx-0.5">{nextHoliday.name}</span> {t('calendar.holiday.middle')}</span>
                <span className="font-bold text-[var(--os-accent)]">{nextHoliday.days} {t('calendar.holiday.suffix')}</span>
              </div>
            )}

            {/* 4. On This Day */}
            <div className="text-xs bg-[var(--os-bg-base)]/50 p-2 rounded-lg border border-[var(--os-border)]/50 min-h-[48px] flex flex-col gap-1 relative overflow-hidden group">
              <span className="font-bold opacity-50 text-[9px] uppercase tracking-widest flex items-center gap-1">
                <RotateCcw size={8} />
                {t('calendar.history.title')}
              </span>
              {loadingHistory ? (
                <span className="opacity-50 animate-pulse">{t('calendar.history.loading')}</span>
              ) : historyEvent ? (
                <div className="flex gap-2">
                  <span className="font-mono text-[var(--os-accent)] opacity-80 shrink-0">{historyEvent.year}</span>
                  <span className="line-clamp-2 opacity-90 leading-tight" title={historyEvent.text}>{historyEvent.text}</span>
                </div>
              ) : (
                <span className="opacity-50">{t('calendar.history.empty')}</span>
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
