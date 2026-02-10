import React from 'react'

export function BentoCard({ icon: Icon, title, value, unit, desc }: { icon: any, title: string, value: string, unit?: string, desc?: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex flex-col justify-between hover:bg-white/15 transition-all duration-300 group hover:scale-[1.02] weather-card-collision">
      <div className="flex items-center gap-2 text-white/60 mb-2 text-xs font-medium uppercase tracking-wider">
        <Icon size={14} />
        {title}
      </div>
      <div>
        <div className="text-3xl font-light tracking-tight flex items-baseline gap-1">
          {value}
          {unit && <span className="text-base text-white/50 font-normal">{unit}</span>}
        </div>
        {desc && <div className="text-xs text-white/50 mt-1">{desc}</div>}
      </div>
    </div>
  )
}
