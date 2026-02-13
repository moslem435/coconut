import { FileNode } from '@/os/kernel/useFileSystemStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import {
  Folder, FileText, Image as ImageIcon, Music, Video, Code,
  File, StickyNote, FileJson, FileCode2, FileSpreadsheet,
  Archive, Database, Braces, Settings, Package, Palette,
  Box, Hash, Monitor, Smartphone, Layout, Component,
  Terminal, Shield, Globe, Coffee, Link, FileSymlink,
  FileQuestion, Command, Cpu, GitGraph
} from 'lucide-react'
import React from 'react'

// Define return type
export interface FileIconTheme {
  Icon: any
  backgroundColor: string
  color?: string // Text color, usually white
  useAppIcon: boolean
  manifest?: any
  isShortcut?: boolean
}

// Color Palette
const COLORS = {
  blue: '#3b82f6',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  green: '#22c55e',
  lime: '#84cc16',
  yellow: '#eab308',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  rose: '#f43f5e',
  purple: '#a855f7',
  violet: '#8b5cf6',
  indigo: '#6366f1',
  slate: '#64748b',
  gray: '#71717a',
  stone: '#78716c',
  zinc: '#52525b',
}

// Exact Filename Mappings
const EXACT_MATCHES: Record<string, { icon: React.ElementType, color: string }> = {
  'package.json': { icon: Package, color: COLORS.red },
  'package-lock.json': { icon: Hash, color: COLORS.stone },
  'yarn.lock': { icon: Hash, color: COLORS.stone },
  'pnpm-lock.yaml': { icon: Hash, color: COLORS.stone },
  'tsconfig.json': { icon: Settings, color: COLORS.blue },
  'jsconfig.json': { icon: Settings, color: COLORS.yellow },
  'readme.md': { icon: FileText, color: COLORS.slate },
  'license': { icon: FileText, color: COLORS.yellow },
  'license.md': { icon: FileText, color: COLORS.yellow },
  '.gitignore': { icon: GitGraph, color: COLORS.orange },
  '.env': { icon: Settings, color: COLORS.slate },
  '.env.local': { icon: Settings, color: COLORS.slate },
  'dockerfile': { icon: Box, color: COLORS.blue },
  'makefile': { icon: Terminal, color: COLORS.slate },
  'robots.txt': { icon: FileText, color: COLORS.green },
}

// Extension Mappings
const EXTENSION_MATCHES: Record<string, { icon: React.ElementType, color: string }> = {
  // Code / Logic (Blue/Yellow/Amber)
  'ts': { icon: FileCode2, color: COLORS.blue },
  'tsx': { icon: FileCode2, color: COLORS.blue },
  'js': { icon: FileCode2, color: COLORS.yellow },
  'jsx': { icon: FileCode2, color: COLORS.yellow },
  'mjs': { icon: FileCode2, color: COLORS.yellow },
  'cjs': { icon: FileCode2, color: COLORS.yellow },
  'java': { icon: Coffee, color: COLORS.red },
  'py': { icon: FileCode2, color: COLORS.blue },
  'go': { icon: FileCode2, color: COLORS.cyan },
  'rs': { icon: Settings, color: COLORS.orange }, // Rust
  'c': { icon: FileCode2, color: COLORS.blue },
  'cpp': { icon: FileCode2, color: COLORS.blue },
  'cs': { icon: FileCode2, color: COLORS.purple }, // C#
  'php': { icon: FileCode2, color: COLORS.indigo },
  'rb': { icon: FileCode2, color: COLORS.red }, // Ruby

  // View / Styles (Orange/Pink/Cyan)
  'html': { icon: Globe, color: COLORS.orange },
  'htm': { icon: Globe, color: COLORS.orange },
  'css': { icon: Palette, color: COLORS.sky },
  'scss': { icon: Palette, color: COLORS.pink },
  'sass': { icon: Palette, color: COLORS.pink },
  'less': { icon: Palette, color: COLORS.indigo },
  'svg': { icon: ImageIcon, color: COLORS.amber },

  // Data / Config (Green/Stone)
  'json': { icon: Braces, color: COLORS.emerald },
  'yaml': { icon: Settings, color: COLORS.slate },
  'yml': { icon: Settings, color: COLORS.slate },
  'xml': { icon: Code, color: COLORS.orange },
  'sql': { icon: Database, color: COLORS.cyan },
  'db': { icon: Database, color: COLORS.cyan },
  'sqlite': { icon: Database, color: COLORS.cyan },
  'csv': { icon: FileSpreadsheet, color: COLORS.green },
  'toml': { icon: Settings, color: COLORS.slate },
  'ini': { icon: Settings, color: COLORS.slate },
  'conf': { icon: Settings, color: COLORS.slate },

  // Media (Purple/Violet/Pink)
  'png': { icon: ImageIcon, color: COLORS.purple },
  'jpg': { icon: ImageIcon, color: COLORS.purple },
  'jpeg': { icon: ImageIcon, color: COLORS.purple },
  'gif': { icon: ImageIcon, color: COLORS.purple },
  'webp': { icon: ImageIcon, color: COLORS.purple },
  'ico': { icon: ImageIcon, color: COLORS.purple },
  'mp4': { icon: Video, color: COLORS.violet },
  'webm': { icon: Video, color: COLORS.violet },
  'mov': { icon: Video, color: COLORS.violet },
  'avi': { icon: Video, color: COLORS.violet },
  'mp3': { icon: Music, color: COLORS.pink },
  'wav': { icon: Music, color: COLORS.pink },
  'ogg': { icon: Music, color: COLORS.pink },

  // Documents (Slate/Red/Blue)
  'md': { icon: FileText, color: COLORS.slate },
  'txt': { icon: FileText, color: COLORS.slate },
  'pdf': { icon: FileText, color: COLORS.red },
  'doc': { icon: FileText, color: COLORS.blue },
  'docx': { icon: FileText, color: COLORS.blue },
  'xls': { icon: FileSpreadsheet, color: COLORS.green },
  'xlsx': { icon: FileSpreadsheet, color: COLORS.green },
  'ppt': { icon: Monitor, color: COLORS.orange },
  'pptx': { icon: Monitor, color: COLORS.orange },

  // System / Archives (Stone/Zinc)
  'zip': { icon: Archive, color: COLORS.stone },
  'rar': { icon: Archive, color: COLORS.stone },
  '7z': { icon: Archive, color: COLORS.stone },
  'tar': { icon: Archive, color: COLORS.stone },
  'gz': { icon: Archive, color: COLORS.stone },
  'exe': { icon: Command, color: COLORS.zinc },
  'msi': { icon: Package, color: COLORS.zinc },
  'dmg': { icon: Package, color: COLORS.zinc },
  'iso': { icon: Disc, color: COLORS.zinc },
}

import { Disc } from 'lucide-react'

export const getFileIconAndTheme = (node: FileNode): FileIconTheme => {
  // 1. App Shortcut (Highest Priority)
  if (node.appId) {
    const manifest = APPS_REGISTRY[node.appId]
    if (manifest) {
      return {
        Icon: manifest.icon,
        backgroundColor: manifest.theme?.backgroundColor || COLORS.blue,
        useAppIcon: true,
        manifest,
        isShortcut: true
      }
    }
  }

  // 2. Folder
  if (node.type === 'folder') {
    // Check for special folders based on name (optional enhancement)
    return {
      Icon: Folder,
      backgroundColor: COLORS.yellow,
      useAppIcon: false
    }
  }

  const lowerName = node.name.toLowerCase()

  // 3. Exact Filename Match
  if (EXACT_MATCHES[lowerName]) {
    const match = EXACT_MATCHES[lowerName]
    return {
      Icon: match.icon,
      backgroundColor: match.color,
      useAppIcon: false
    }
  }

  // 4. Extension Match
  const ext = lowerName.split('.').pop()
  if (ext && EXTENSION_MATCHES[ext]) {
    const match = EXTENSION_MATCHES[ext]
    return {
      Icon: match.icon,
      backgroundColor: match.color,
      useAppIcon: false
    }
  }

  // 5. Fallback
  return {
    Icon: File,
    backgroundColor: COLORS.gray,
    useAppIcon: false
  }
}
