import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { History, Calculator as CalcIcon, Delete, RefreshCw, X } from 'lucide-react'

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')
  const [isNewNumber, setIsNewNumber] = useState(true)
  const [mode, setMode] = useState<'standard' | 'scientific'>('standard')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<{eq: string, res: string}[]>([])
  const { t } = useLanguage()

  const handleNumber = (num: string) => {
    if (isNewNumber) {
      setDisplay(num)
      setIsNewNumber(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ')
    setIsNewNumber(true)
  }

  const calculate = (eq: string) => {
      try {
          // Replace symbols for eval
          let safeEq = eq.replace(/×/g, '*').replace(/÷/g, '/')
          // Handle scientific functions if present in string (simplified for now, mostly handled via immediate action)
          // eslint-disable-next-line no-eval
          const result = eval(safeEq)
          return String(result)
      } catch (e) {
          return 'Error'
      }
  }

  const handleEqual = () => {
    const finalEq = equation + display
    const result = calculate(finalEq)
    
    if (result !== 'Error') {
        setHistory(prev => [{ eq: finalEq, res: result }, ...prev].slice(0, 50))
    }

    setDisplay(result)
    setEquation('')
    setIsNewNumber(true)
  }

  const handleScientific = (func: string) => {
      const current = parseFloat(display)
      let res = 0
      switch(func) {
          case 'sin': res = Math.sin(current); break;
          case 'cos': res = Math.cos(current); break;
          case 'tan': res = Math.tan(current); break;
          case 'sqrt': res = Math.sqrt(current); break;
          case 'sq': res = Math.pow(current, 2); break;
          case 'log': res = Math.log10(current); break;
          case 'ln': res = Math.log(current); break;
          case '1/x': res = 1 / current; break;
          case 'neg': res = -current; break;
          case 'pi': res = Math.PI; break;
          case 'e': res = Math.E; break;
      }
      // Format to avoid precision errors
      const resStr = String(parseFloat(res.toPrecision(12)))
      setDisplay(resStr)
      setIsNewNumber(true)
  }

  const handleClear = () => {
    setDisplay('0')
    setEquation('')
    setIsNewNumber(true)
  }

  const handleBackspace = () => {
      if (isNewNumber) return
      if (display.length === 1) setDisplay('0')
      else setDisplay(display.slice(0, -1))
  }

  const commonBtnClass = "rounded-lg text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
  const numBtnClass = `${commonBtnClass} bg-gray-700 hover:bg-gray-600 text-white`
  const opBtnClass = `${commonBtnClass} bg-orange-500 hover:bg-orange-600 text-white`
  const funcBtnClass = `${commonBtnClass} bg-gray-600 hover:bg-gray-500 text-gray-100 text-base`

  return (
    <div className="h-full w-full bg-[#202020] flex text-white relative font-sans select-none pt-10">
      
      {/* Main Calculator */}
      <div className="flex-1 flex flex-col p-4 max-w-full">
        {/* Header / Mode Switch */}
        <div className="flex justify-between items-center mb-4">
            <button 
                onClick={() => setMode(m => m === 'standard' ? 'scientific' : 'standard')}
                className="flex items-center gap-2 text-xs font-medium bg-gray-800 px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
            >
                <CalcIcon size={14} />
                {mode === 'standard' ? t('calc.standard') : t('calc.scientific')}
            </button>
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${showHistory ? 'text-orange-500' : 'text-gray-400'}`}
            >
                <History size={18} />
            </button>
        </div>

        {/* Display */}
        <div className="bg-black/20 p-4 rounded-xl text-right flex flex-col justify-end h-32 mb-4 border border-white/5">
            <div className="text-gray-400 text-sm h-6 font-mono opacity-70">{equation}</div>
            <div className={`text-white font-light font-mono truncate transition-all ${display.length > 10 ? 'text-3xl' : 'text-5xl'}`}>
                {display}
            </div>
        </div>
        
        {/* Keypad */}
        <div className={`grid gap-2 flex-1 ${mode === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
            
            {/* Scientific Keys (Left Column if Active) */}
            {mode === 'scientific' && (
                <>
                    <button onClick={() => handleScientific('sin')} className={funcBtnClass}>sin</button>
                    <button onClick={() => handleScientific('cos')} className={funcBtnClass}>cos</button>
                    <button onClick={() => handleScientific('tan')} className={funcBtnClass}>tan</button>
                    <button onClick={() => handleScientific('ln')} className={funcBtnClass}>ln</button>
                    <button onClick={() => handleScientific('log')} className={funcBtnClass}>log</button>
                </>
            )}

            {/* Standard Grid */}
            <button onClick={handleClear} className={`${commonBtnClass} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>AC</button>
            <button onClick={handleBackspace} className={funcBtnClass}><Delete size={18} /></button>
            <button onClick={() => handleScientific('neg')} className={funcBtnClass}>+/-</button>
            <button onClick={() => handleOperator('/')} className={opBtnClass}>÷</button>

            {mode === 'scientific' && <button onClick={() => handleScientific('pi')} className={funcBtnClass}>π</button>}
            <button onClick={() => handleNumber('7')} className={numBtnClass}>7</button>
            <button onClick={() => handleNumber('8')} className={numBtnClass}>8</button>
            <button onClick={() => handleNumber('9')} className={numBtnClass}>9</button>
            <button onClick={() => handleOperator('*')} className={opBtnClass}>×</button>

            {mode === 'scientific' && <button onClick={() => handleScientific('sq')} className={funcBtnClass}>x²</button>}
            <button onClick={() => handleNumber('4')} className={numBtnClass}>4</button>
            <button onClick={() => handleNumber('5')} className={numBtnClass}>5</button>
            <button onClick={() => handleNumber('6')} className={numBtnClass}>6</button>
            <button onClick={() => handleOperator('-')} className={opBtnClass}>-</button>

            {mode === 'scientific' && <button onClick={() => handleScientific('sqrt')} className={funcBtnClass}>√</button>}
            <button onClick={() => handleNumber('1')} className={numBtnClass}>1</button>
            <button onClick={() => handleNumber('2')} className={numBtnClass}>2</button>
            <button onClick={() => handleNumber('3')} className={numBtnClass}>3</button>
            <button onClick={() => handleOperator('+')} className={opBtnClass}>+</button>

            {mode === 'scientific' && <button onClick={() => handleScientific('e')} className={funcBtnClass}>e</button>}
            <button onClick={() => handleNumber('0')} className={`${numBtnClass} col-span-2`}>0</button>
            <button onClick={() => handleNumber('.')} className={numBtnClass}>.</button>
            <button onClick={handleEqual} className={`${commonBtnClass} bg-orange-500 hover:bg-orange-400 text-white`}>=</button>
        </div>
      </div>

      {/* History Sidebar */}
      <div 
        className={`
            absolute top-0 right-0 h-full bg-[#1a1a1a] border-l border-white/5 transition-all duration-300 z-10 flex flex-col
            ${showHistory ? 'w-64 translate-x-0' : 'w-64 translate-x-full opacity-0 pointer-events-none'}
        `}
      >
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
              <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">{t('calc.history')}</span>
              <button onClick={() => setHistory([])} className="text-gray-500 hover:text-red-400"><Delete size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {history.length === 0 && (
                  <div className="text-center text-gray-600 text-sm mt-10">{t('calc.no_history')}</div>
              )}
              {history.map((item, i) => (
                  <div key={i} className="p-3 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors" onClick={() => {
                      setDisplay(item.res)
                      setIsNewNumber(true)
                  }}>
                      <div className="text-right text-xs text-gray-500 mb-1">{item.eq} =</div>
                      <div className="text-right text-lg text-emerald-400 group-hover:text-emerald-300">{item.res}</div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  )
}

export default Calculator
