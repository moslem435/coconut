import { Atom, Activity, Palette, Terminal, Zap, Layers, Hexagon, Move, Shapes } from 'lucide-react'

export const getAccentColors = (t: (key: string) => string) => [
    { name: t('color.cyan'), value: '#06b6d4' },
    { name: t('color.blue'), value: '#3b82f6' },
    { name: t('color.purple'), value: '#8b5cf6' },
    { name: t('color.pink'), value: '#ec4899' },
    { name: t('color.red'), value: '#ef4444' },
    { name: t('color.orange'), value: '#f97316' },
    { name: t('color.green'), value: '#22c55e' },
]

export const getWallpaperOptions = (t: (key: string) => string) => [
    { name: t('wallpaper.preset.flow'), type: 'preset' as const, value: 'linear-gradient(to bottom right, var(--os-bg-base), var(--os-accent-dim))' },
    { name: t('wallpaper.preset.stars'), type: 'preset' as const, value: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)' },
    { name: t('wallpaper.preset.neon'), type: 'preset' as const, value: 'linear-gradient(to right, #f83600 0%, #f9d423 100%)' },
    { name: t('wallpaper.preset.midnight'), type: 'preset' as const, value: 'linear-gradient(109.6deg, rgb(36, 45, 57) 11.2%, rgb(16, 37, 60) 51.2%, rgb(0, 0, 0) 98.6%)' },
    { name: t('wallpaper.image.daily'), type: 'image' as const, value: 'daily' },
    { name: t('wallpaper.image.snow'), type: 'image' as const, value: '/api/proxy?url=' + encodeURIComponent('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80') },
    { name: t('wallpaper.image.desert'), type: 'image' as const, value: '/api/proxy?url=' + encodeURIComponent('https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80') },
    { name: t('wallpaper.image.city'), type: 'image' as const, value: '/api/proxy?url=' + encodeURIComponent('https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80') },
]

export const techStack = [
    { icon: <Atom size={20} />, name: 'React 19', color: '#61DAFB' },
    { icon: <Layers size={20} />, name: 'Next.js 16', color: '#FFFFFF' },
    { icon: <Terminal size={20} />, name: 'TypeScript', color: '#3178C6' },
    { icon: <Palette size={20} />, name: 'Tailwind 4', color: '#38B2AC' },
    { icon: <Zap size={20} />, name: 'Zustand', color: '#F59E0B' },
    { icon: <Activity size={20} />, name: 'Framer Motion', color: '#EC4899' },
    { icon: <Hexagon size={20} />, name: 'Three.js / R3F', color: '#FFFFFF' },
    { icon: <Move size={20} />, name: 'dnd-kit', color: '#FFFFFF' },
    { icon: <Shapes size={20} />, name: 'Lucide Icons', color: '#FF7F50' },
]
