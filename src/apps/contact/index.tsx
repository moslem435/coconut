'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, Trash2, File, Plus, Search, Star, Paperclip, MoreHorizontal, User, Reply, Forward, AlertCircle } from 'lucide-react'
import { soundManager } from '@/lib/sound'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'

// Types
type Folder = 'inbox' | 'sent' | 'drafts' | 'trash'

interface Message {
  id: string
  folder: Folder
  from: string
  to: string
  subject: string
  subjectKey?: string
  preview: string
  previewKey?: string
  content: string
  contentKey?: string
  date: string
  read: boolean
  starred: boolean
  avatar?: string
}

// Mock Data
const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    folder: 'inbox',
    from: 'Yume',
    to: 'Visitor',
    subject: 'Welcome to Portfolio OS',
    subjectKey: 'contact.welcome.subject',
    preview: 'Thanks for visiting my digital workspace...',
    previewKey: 'contact.welcome.preview',
    content: `Hi there,

Welcome to Portfolio OS! This system was built to demonstrate advanced frontend capabilities using React, Next.js, and Three.js.

Feel free to explore the file system, run commands in the terminal, or check out my projects in the Portfolio Hub.

If you'd like to get in touch, just hit "Reply" or compose a new message.

Best regards,
Yume
Full Stack Engineer`,
    contentKey: 'contact.welcome.content',
    date: '10:42 AM',
    read: false,
    starred: true,
    avatar: 'YM'
  },
  {
    id: '2',
    folder: 'inbox',
    from: 'System Admin',
    to: 'Visitor',
    subject: 'Security Alert: Login Detected',
    subjectKey: 'contact.security.subject',
    preview: 'New login detected from your current location...',
    previewKey: 'contact.security.preview',
    content: `New login session initialized.
    
Device: Web Browser
Location: Unknown Proxy
IP: 127.0.0.1

If this wasn't you, well... it's a simulation, so don't worry about it.

- SysAdmin`,
    contentKey: 'contact.security.content',
    date: 'Yesterday',
    read: true,
    starred: false,
    avatar: 'SA'
  }
]

export default function ContactApp() {
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox')
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { t } = useLanguage()
  const { addNotification } = useNotificationStore()
  
  // Mobile responsive helper
  const showList = !selectedId && !isComposing
  const showContent = selectedId || isComposing
  const currentMessages = messages
    .filter(m => {
        if (!searchQuery) return m.folder === activeFolder
        const q = searchQuery.toLowerCase()
        return m.subject.toLowerCase().includes(q) || 
               m.from.toLowerCase().includes(q) || 
               m.content.toLowerCase().includes(q)
    })

  const selectedMessage = messages.find(m => m.id === selectedId)

  // Compose State
  const [composeData, setComposeData] = useState({ to: 'dev@yume.me', subject: '', content: '' })

  const handleSend = () => {
    setIsSending(true)
    setTimeout(() => {
        const newMessage: Message = {
          id: Date.now().toString(),
          folder: 'sent',
          from: 'Visitor',
          to: composeData.to,
          subject: composeData.subject || t('contact.no_subject'),
          preview: composeData.content.substring(0, 50) + '...',
          content: composeData.content,
          date: t('contact.just_now'),
          read: true,
          starred: false,
          avatar: 'ME'
        }
        
        setMessages(prev => [newMessage, ...prev])
        setIsComposing(false)
        setActiveFolder('sent')
        setSelectedId(newMessage.id)
        setComposeData({ to: 'dev@yume.me', subject: '', content: '' })
        soundManager.playClick()
        addNotification({
            type: 'success',
            title: t('contact.sent'),
            message: `Message sent to ${newMessage.to}`
        })
        setIsSending(false)
    }, 1500)
  }

  return (
    <div className="h-full w-full flex bg-[#f5f5f5] text-[#333] pt-8 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-[#e5e5e5] border-r border-[#d4d4d4] flex flex-col shrink-0 transition-all duration-300">
        <div className="p-4 flex justify-center md:justify-start">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white py-2 px-2 md:px-4 rounded shadow-sm flex items-center justify-center gap-2 font-medium transition-colors"
            title={t('contact.new')}
          >
            <Plus size={18} />
            <span className="hidden md:inline">{t('contact.new')}</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {[
            { id: 'inbox', icon: Mail, label: t('contact.inbox'), count: messages.filter(m => m.folder === 'inbox' && !m.read).length },
            { id: 'sent', icon: Send, label: t('contact.sent'), count: 0 },
            { id: 'drafts', icon: File, label: t('contact.drafts'), count: 0 },
            { id: 'trash', icon: Trash2, label: t('contact.trash'), count: 0 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                  setActiveFolder(item.id as Folder)
                  setSearchQuery('')
                  setSelectedId(null)
                  setIsComposing(false)
              }}
              className={`w-full flex items-center justify-center md:justify-between px-2 md:px-6 py-2 text-sm ${activeFolder === item.id ? 'bg-[#cce8ff] text-[#0078d4] font-medium' : 'text-[#666] hover:bg-[#dcdcdc]'}`}
              title={item.label}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="text-xs bg-[#0078d4] text-white px-1.5 rounded-full absolute md:static top-2 right-2 md:top-auto md:right-auto">{item.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Message List */}
      <div className={`bg-white border-r border-[#e5e5e5] flex flex-col shrink-0 w-full md:w-80 h-full ${showContent ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-[#e5e5e5]">
          <div className="relative">
            <Search className="absolute left-2 top-2 text-[#999]" size={14} />
            <input 
              type="text" 
              placeholder={t('contact.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f0f0f0] border-none rounded pl-8 py-1.5 text-sm focus:ring-1 focus:ring-[#0078d4] outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#999] text-sm p-8 text-center">
              <div className="w-12 h-12 bg-[#f0f0f0] rounded-full flex items-center justify-center mb-3">
                <Mail size={24} className="opacity-50" />
              </div>
              {t('contact.empty')}
            </div>
          ) : searchQuery ? (
             (['inbox', 'sent', 'drafts', 'trash'] as Folder[]).map(folder => {
                 const folderMsgs = currentMessages.filter(m => m.folder === folder)
                 if (folderMsgs.length === 0) return null
                 return (
                     <div key={folder}>
                         <div className="bg-gray-100 px-4 py-1 text-xs font-bold uppercase text-gray-500 sticky top-0 border-b border-[#e5e5e5]">{t(`contact.${folder}`)}</div>
                         {folderMsgs.map((msg) => (
                              <div
                                key={msg.id}
                                onClick={() => setSelectedId(msg.id)}
                                className={`p-4 border-b border-[#f0f0f0] cursor-pointer hover:bg-[#f9f9f9] ${selectedId === msg.id ? 'bg-[#eff6fc] border-l-4 border-l-[#0078d4]' : 'border-l-4 border-l-transparent'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-sm truncate ${!msg.read ? 'font-bold text-black' : 'text-[#333]'}`}>{msg.from}</span>
                                  <span className="text-xs text-[#888] whitespace-nowrap ml-2">{msg.date}</span>
                                </div>
                                <div className={`text-sm mb-1 truncate ${!msg.read ? 'font-semibold text-[#0078d4]' : 'text-[#555]'}`}>{msg.subjectKey ? t(msg.subjectKey) : msg.subject}</div>
                                <div className="text-xs text-[#777] line-clamp-2">{msg.previewKey ? t(msg.previewKey) : msg.preview}</div>
                              </div>
                         ))}
                     </div>
                 )
             })
          ) : (
            currentMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedId(msg.id)}
                className={`p-4 border-b border-[#f0f0f0] cursor-pointer hover:bg-[#f9f9f9] ${selectedId === msg.id ? 'bg-[#eff6fc] border-l-4 border-l-[#0078d4]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm truncate ${!msg.read ? 'font-bold text-black' : 'text-[#333]'}`}>{msg.from}</span>
                  <span className="text-xs text-[#888] whitespace-nowrap ml-2">{msg.date}</span>
                </div>
                <div className={`text-sm mb-1 truncate ${!msg.read ? 'font-semibold text-[#0078d4]' : 'text-[#555]'}`}>{msg.subjectKey ? t(msg.subjectKey) : msg.subject}</div>
                <div className="text-xs text-[#777] line-clamp-2">{msg.previewKey ? t(msg.previewKey) : msg.preview}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reading Pane / Compose */}
      <div className={`flex-1 bg-white flex flex-col min-w-0 ${!showContent ? 'hidden md:flex' : 'flex'}`}>
        {isComposing ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsComposing(false)} className="md:hidden p-1 -ml-2 text-[#666]">
                    <Reply size={20} className="rotate-180" />
                </button>
                <span className="font-semibold text-sm">{t('contact.new')}</span>
              </div>
              <button onClick={() => setIsComposing(false)}><AlertCircle size={16} className="text-[#999] hover:text-[#333]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#e5e5e5] pb-2">
                <span className="text-[#777] text-sm w-10">{t('contact.to')}</span>
                <input 
                  value={composeData.to}
                  onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                  className="flex-1 outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-[#e5e5e5] pb-2">
                <span className="text-[#777] text-sm w-10">{t('contact.subj')}</span>
                <input 
                  value={composeData.subject}
                  onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                  className="flex-1 outline-none text-sm"
                  placeholder={t('contact.subject')}
                  autoFocus
                />
              </div>
              <textarea 
                value={composeData.content}
                onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                className="w-full h-64 resize-none outline-none text-sm mt-4 font-sans"
                placeholder={t('contact.type')}
              />
            </div>
            <div className="p-4 border-t border-[#e5e5e5] flex justify-between items-center bg-[#f9f9f9]">
              <div className="flex gap-2 text-[#666]">
                 <button className="p-2 hover:bg-[#e5e5e5] rounded"><Paperclip size={18} /></button>
                 <button className="p-2 hover:bg-[#e5e5e5] rounded"><MoreHorizontal size={18} /></button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsComposing(false)}
                  className="px-4 py-2 text-sm text-[#666] hover:bg-[#e5e5e5] rounded"
                >
                  {t('contact.discard')}
                </button>
                <button 
                  onClick={handleSend}
                  disabled={isSending}
                  className={`px-4 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm rounded flex items-center gap-2 shadow-sm ${isSending ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSending ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />} 
                  {isSending ? 'Sending...' : t('contact.send')}
                </button>
              </div>
            </div>
          </div>
        ) : selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-6 border-b border-[#e5e5e5]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedId(null)} className="md:hidden p-1 -ml-2 text-[#666]">
                        <Reply size={20} className="rotate-180" />
                    </button>
                    <h2 className="text-xl font-semibold text-[#222] line-clamp-2">{selectedMessage.subjectKey ? t(selectedMessage.subjectKey) : selectedMessage.subject}</h2>
                </div>
                <div className="flex gap-2 text-[#666] shrink-0">
                  <button className="p-2 hover:bg-[#f0f0f0] rounded" title="Reply"><Reply size={18} /></button>
                  <button className="p-2 hover:bg-[#f0f0f0] rounded" title="Forward"><Forward size={18} /></button>
                  <button className="p-2 hover:bg-[#f0f0f0] rounded" title="Delete"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#555] font-bold text-sm border border-[#e0e0e0]">
                  {selectedMessage.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#222]">{selectedMessage.from}</div>
                  <div className="text-xs text-[#777]">{t('contact.to')} {selectedMessage.to}</div>
                </div>
                <div className="ml-auto text-xs text-[#777]">{selectedMessage.date}</div>
              </div>
            </div>
            {/* Message Body */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-3xl text-[#333] text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {selectedMessage.contentKey ? t(selectedMessage.contentKey) : selectedMessage.content}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#999]">
             <div className="text-center">
               <Mail size={48} className="mx-auto mb-4 opacity-20" />
               <p>{t('contact.select')}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
