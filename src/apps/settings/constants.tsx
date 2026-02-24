import { Atom, Activity, Palette, Terminal, Zap, Layers, Hexagon, Move, Shapes, Container, Brain, Code, SquareTerminal, HardDrive } from 'lucide-react'

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
    { name: t('wallpaper.image.snow'), type: 'image' as const, value: '/wallpapers/snow.jpg' },
    { name: t('wallpaper.image.desert'), type: 'image' as const, value: '/wallpapers/desert.jpg' },
    { name: t('wallpaper.image.city'), type: 'image' as const, value: '/wallpapers/city.jpg' },
]

export const techStack = [
    { icon: <Atom size={20} />, name: 'React 19', color: '#61DAFB', url: 'https://react.dev' },
    { icon: <Layers size={20} />, name: 'Next.js 16', color: '#FFFFFF', url: 'https://nextjs.org' },
    { icon: <Terminal size={20} />, name: 'TypeScript', color: '#3178C6', url: 'https://www.typescriptlang.org' },
    { icon: <Palette size={20} />, name: 'Tailwind 4', color: '#38B2AC', url: 'https://tailwindcss.com' },
    { icon: <Zap size={20} />, name: 'Zustand', color: '#F59E0B', url: 'https://zustand-demo.pmnd.rs' },
    { icon: <Activity size={20} />, name: 'Framer Motion', color: '#EC4899', url: 'https://www.framer.com/motion' },
    { icon: <Hexagon size={20} />, name: 'Three.js / R3F', color: '#FFFFFF', url: 'https://docs.pmnd.rs/react-three-fiber' },
    { icon: <Move size={20} />, name: 'dnd-kit', color: '#FFFFFF', url: 'https://dndkit.com' },
    { icon: <Container size={20} />, name: 'WebContainer', color: '#FCD34D', url: 'https://webcontainers.io' },
    { icon: <Brain size={20} />, name: 'WebLLM', color: '#F97316', url: 'https://webllm.mlc.ai' },
    { icon: <Code size={20} />, name: 'Monaco Editor', color: '#3B82F6', url: 'https://microsoft.github.io/monaco-editor' },
    { icon: <SquareTerminal size={20} />, name: 'Xterm.js', color: '#22C55E', url: 'https://xtermjs.org' },
    { icon: <HardDrive size={20} />, name: 'OPFS / IDB', color: '#EC4899', url: 'https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system' },
    { icon: <Shapes size={20} />, name: 'Lucide Icons', color: '#FF7F50', url: 'https://lucide.dev' },
]
