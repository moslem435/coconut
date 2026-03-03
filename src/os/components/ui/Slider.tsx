import React from 'react';

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  formatValue
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 py-2">
      {(label || formatValue) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-[var(--os-text-secondary)]">{label}</span>}
          {formatValue && (
            <span className="text-[var(--os-text-primary)] font-medium font-mono text-xs">
              {formatValue(value)}
            </span>
          )}
        </div>
      )}
      
      <div className="relative h-6 flex items-center select-none group">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 rounded-full bg-[var(--os-border)] overflow-hidden">
          {/* Active Track */}
          <div 
            className="h-full bg-[var(--os-accent)] transition-all duration-100"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Range Input (Invisible but interactive) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />

        {/* Thumb (Visual only) */}
        <div 
          className="absolute h-4 w-4 rounded-full bg-white shadow-md border border-gray-200 pointer-events-none transition-all duration-100 z-10 group-hover:scale-110 group-active:scale-95"
          style={{ 
            left: `calc(${percentage}% - 8px)` // Center the thumb
          }}
        />
      </div>
    </div>
  );
}
