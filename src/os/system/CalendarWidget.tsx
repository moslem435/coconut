'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Plus, Check, Trash2, Calendar as CalendarIcon, CheckCircle2, Circle } from 'lucide-react'
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useTodoStore } from '@/os/kernel/useTodoStore'

export default function CalendarWidget() {
  const { t, language } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  
  // Todo State
  const { todos, addTodo, toggleTodo, deleteTodo, getTodosByDate } = useTodoStore()
  const [newTodoContent, setNewTodoContent] = useState('')
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

      // Check if has todos
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const dayTodos = todos.filter(t => t.date === dateStr)
      const hasTodos = dayTodos.length > 0
      const hasPendingTodos = dayTodos.some(t => !t.completed)

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
        hasTodos,
        hasPendingTodos,
        dateStr,
        gzYear: language === 'zh' ? lunar.getYearInGanZhi() : '',
        gzMonth: language === 'zh' ? lunar.getMonthInGanZhi() : '',
        gzDay: language === 'zh' ? lunar.getDayInGanZhi() : '',
        animal: language === 'zh' ? lunar.getYearShengXiao() : '',
        astro: language === 'zh' ? solar.getXingZuo() : ''
      })
    }

    return { days, monthName, year, currentMonth: month, currentYear: year }
  }, [currentDate, language, todos])

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

  // Get todos for active day
  const activeDateStr = activeDay ? `${year}-${String(currentMonth + 1).padStart(2, '0')}-${String(activeDay.day).padStart(2, '0')}` : ''
  const activeTodos = useMemo(() => getTodosByDate(activeDateStr), [activeDateStr, todos])

  const handleAddTodo = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTodoContent.trim() && activeDateStr) {
      addTodo(newTodoContent.trim(), activeDateStr)
      setNewTodoContent('')
    }
  }

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

                      {/* Todo Indicator */}
                      {d.hasTodos && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            <div className={`w-1 h-1 rounded-full ${d.isToday ? 'bg-white' : (d.hasPendingTodos ? 'bg-[var(--os-accent)]' : 'bg-[var(--os-text-muted)]')}`} />
                        </div>
                      )}

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

      {/* Todo Section */}
      <div className="flex flex-col gap-3 flex-1 min-h-[200px]">
        {/* Selected Date Header */}
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
             <div className="text-xs text-[var(--os-text-muted)] font-mono">
                {activeTodos.filter(t => t.completed).length}/{activeTodos.length} Done
             </div>
        </div>

        {/* Add Todo Input */}
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)] group-focus-within:text-[var(--os-accent)] transition-colors">
                <Plus size={16} />
            </div>
            <input 
                type="text" 
                value={newTodoContent}
                onChange={(e) => setNewTodoContent(e.target.value)}
                onKeyDown={handleAddTodo}
                placeholder={t('todo.add_placeholder') || "Add a task..."}
                className="w-full bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-[var(--os-accent)] focus:bg-[var(--os-bg-base)] transition-all placeholder:text-[var(--os-text-muted)]/50"
            />
        </div>

        {/* Todo List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-1">
            {activeTodos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]/40 gap-2 min-h-[100px]">
                    <CalendarIcon size={32} strokeWidth={1.5} />
                    <span className="text-xs">No tasks for this day</span>
                </div>
            ) : (
                <AnimatePresence mode='popLayout'>
                    {activeTodos.map(todo => (
                        <motion.div
                            layout
                            key={todo.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--os-hover-bg)] transition-colors group"
                        >
                            <button 
                                onClick={() => toggleTodo(todo.id)}
                                className={`shrink-0 transition-colors ${todo.completed ? 'text-[var(--os-accent)]' : 'text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)]'}`}
                            >
                                {todo.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <span className={`flex-1 text-sm truncate ${todo.completed ? 'text-[var(--os-text-muted)] line-through' : 'text-[var(--os-text-primary)]'}`}>
                                {todo.content}
                            </span>
                            <button 
                                onClick={() => deleteTodo(todo.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
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
