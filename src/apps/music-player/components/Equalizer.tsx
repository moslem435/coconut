import React from 'react'

interface EqualizerProps {
  frequencies: number[]
  gains: number[]
  onChange: (index: number, value: number) => void
}

export const Equalizer: React.FC<EqualizerProps> = ({ frequencies, gains, onChange }) => {
  return (
    <div className="flex items-end justify-center gap-4 h-full p-4">
        {frequencies.map((freq, i) => (
            <div key={freq} className="flex flex-col items-center gap-2 h-full">
                <div className="flex-1 relative w-1 bg-gray-700 rounded-full">
                    <input 
                        type="range" 
                        min="-12" 
                        max="12" 
                        value={gains[i]} 
                        onChange={(e) => onChange(i, Number(e.target.value))}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-4 opacity-0 cursor-pointer z-10"
                        title={`${freq}Hz: ${gains[i]}dB`}
                    />
                    {/* Visual Slider Thumb */}
                    <div 
                        className="absolute w-3 h-3 bg-blue-500 rounded-full left-1/2 -translate-x-1/2 -ml-[1px] pointer-events-none transition-all"
                        style={{ bottom: `${((gains[i] + 12) / 24) * 100}%` }}
                    />
                    {/* Track Fill */}
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-blue-500/30 rounded-full pointer-events-none"
                        style={{ height: `${((gains[i] + 12) / 24) * 100}%` }}
                    />
                </div>
                <span className="text-[10px] text-gray-400">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
            </div>
        ))}
    </div>
  )
}
