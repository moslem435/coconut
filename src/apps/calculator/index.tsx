import React, { useState } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')
  const [isNewNumber, setIsNewNumber] = useState(true)
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

  const handleEqual = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(equation + display)
      setDisplay(String(result))
      setEquation('')
      setIsNewNumber(true)
    } catch (e) {
      setDisplay(t('calculator.error'))
    }
  }

  const handleClear = () => {
    setDisplay('0')
    setEquation('')
    setIsNewNumber(true)
  }

  const buttons = [
    { label: t('calculator.clear'), onClick: handleClear, className: 'col-span-2 bg-red-500 hover:bg-red-600 text-white' },
    { label: '/', onClick: () => handleOperator('/'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '*', onClick: () => handleOperator('*'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '7', onClick: () => handleNumber('7') },
    { label: '8', onClick: () => handleNumber('8') },
    { label: '9', onClick: () => handleNumber('9') },
    { label: '-', onClick: () => handleOperator('-'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '4', onClick: () => handleNumber('4') },
    { label: '5', onClick: () => handleNumber('5') },
    { label: '6', onClick: () => handleNumber('6') },
    { label: '+', onClick: () => handleOperator('+'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '1', onClick: () => handleNumber('1') },
    { label: '2', onClick: () => handleNumber('2') },
    { label: '3', onClick: () => handleNumber('3') },
    { label: '=', onClick: handleEqual, className: 'row-span-2 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center' },
    { label: '0', onClick: () => handleNumber('0'), className: 'col-span-2' },
    { label: '.', onClick: () => handleNumber('.') },
  ]

  return (
    <div className="h-full w-full bg-gray-900/90 p-4 pt-14 flex flex-col gap-4">
      <div className="bg-gray-800/80 p-4 rounded-lg text-right flex flex-col justify-end h-24">
        <div className="text-gray-400 text-sm h-6">{equation}</div>
        <div className="text-white text-4xl font-mono truncate">{display}</div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 flex-1">
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            className={`
              rounded-lg text-xl font-bold transition-colors active:scale-95
              ${btn.className || 'bg-gray-700 hover:bg-gray-600 text-white'}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Calculator
