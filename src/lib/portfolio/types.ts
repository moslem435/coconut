import { LucideIcon } from 'lucide-react'

export interface Project {
    id: string
    title: string
    category: string
    year: string
    description: string
    stats: string[]
    color: string
    accent: string
}

export interface Skill {
    label: string
    level: number
    color: string
}

export interface Experience {
    year: string
    event: string
    status: string
}

export interface SocialLink {
    icon: LucideIcon
    label: string
    href: string
}

export interface WorkItem {
    id: string
    title: string
    type: string
    year: string
    desc: string
    stack: string[]
    color: string
    link?: string
}

export interface LogItem {
    id: string
    title: string
    date: string
    tags: string[]
    content: string
}

export interface LabItem {
    id: string
    title: string
    type: string
    date: string
    video?: string
    color: string
}

export interface ArsenalItem {
    name: string
    category: string
}
