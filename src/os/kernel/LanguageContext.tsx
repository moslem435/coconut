"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'zh';

// Translation Dictionary
const translations = {
  en: {
    // App Titles
    "app.portfolio-hub": "Portfolio Hub",
    "app.settings": "Settings",
    "app.browser": "Browser",
    "app.contact": "Contact",
    "app.file-explorer": "File Explorer",
    "app.music-player": "Music Player",
    "app.notepad": "Notepad",
    "app.photo-gallery": "Photo Gallery",
    "app.recycle-bin": "Recycle Bin",
    "app.resume": "Resume",
    "app.terminal": "Terminal",
    "app.weather": "Weather",
    "app.vscode-lite": "VS Code",

    // Boot Sequence
    "boot.start": "Click to Start",
    "boot.loading": "LOADING SYSTEM...",
    "boot.ready": "SYSTEM READY",
    "boot.init": "SYSTEM INITIALIZATION",
    "boot.memory": "CHECKING MEMORY...",
    "boot.kernel": "LOADING KERNEL...",
    "boot.fs": "MOUNTING FILESYSTEM...",
    "boot.uplink": "ESTABLISHING UPLINK...",

    // Action Center
    "action.notifications": "Notifications",
    "action.clear": "Clear All",
    "action.empty": "No new notifications",
    "action.system": "System Notification",

    // Settings Categories
    "settings.display": "Display",
    "settings.appearance": "Appearance",
    "settings.sound": "Sound",
    "settings.language": "Language",
    "settings.account": "Account",
    "settings.privacy": "Privacy",
    "settings.about": "About",
    "settings.desc.display": "Adjust display settings and theme",
    "settings.desc.appearance": "Customize colors and visual effects",
    "settings.desc.sound": "Volume and notification settings",
    "settings.desc.language": "System language and region",
    "settings.desc.account": "Profile and account information",
    "settings.desc.privacy": "Security and privacy options",
    "settings.desc.about": "System information and version",

    // Files & Folders
    "file.welcome": "Welcome.txt",
    "file.about": "About.md",
    "file.code.hello": "hello_world.ts",
    "file.code.component": "component.tsx",
    "folder.music": "Music",
    "folder.code": "Code",

    // Settings App Compatibility Keys
    "settings.display.theme": "Theme Mode",
    "settings.display.light": "Light",
    "settings.display.dark": "Dark",
    "settings.display.scale": "Display Scale",
    "settings.display.scale.desc": "Adjust the scaling of system fonts and windows.",
    "settings.appearance.wallpaper": "Wallpaper",
    "settings.appearance.icons": "Icon Style",
    "settings.appearance.icons.filled": "Modern (Filled)",
    "settings.appearance.icons.line": "Classic (Line)",
    "settings.appearance.accent": "Accent Color",
    "settings.appearance.effects": "Visual Effects",
    "settings.appearance.transparency": "Enable Transparency & Blur",
    "settings.appearance.animations": "Enable System Animations",
    "settings.appearance.previews": "Enable Taskbar Previews",
    "settings.appearance.skipboot": "Skip Boot Animation",
    "settings.sound.volume": "Volume",
    "settings.language.select": "Select Language",
    "settings.about.uptime": "Uptime",
    "settings.about.dev": "Developer Mode Enabled!",

    // Wallpaper & Colors
    "wallpaper.preset.flow": "Flow",
    "wallpaper.preset.stars": "Stars",
    "wallpaper.preset.neon": "Neon",
    "wallpaper.preset.midnight": "Midnight",
    "wallpaper.image.daily": "Daily Wallpaper",
    "wallpaper.image.snow": "Snow",
    "wallpaper.image.desert": "Desert",
    "wallpaper.image.city": "City",

    "color.cyan": "Cyan",
    "color.blue": "Blue",
    "color.purple": "Purple",
    "color.pink": "Pink",
    "color.red": "Red",
    "color.orange": "Orange",
    "color.green": "Green",

    // Gallery Images
    "gallery.image.img-1": "Abstract 01",
    "gallery.image.img-2": "Cyber City",
    "gallery.image.img-3": "Workspace",


    // Settings Specs
    "settings.specs.title": "System Specs:",
    "settings.specs.os": "FolioOS v1.0",
    "settings.specs.build": "Build: 2026.02.05",
    "settings.specs.browser": "Browser:",
    "settings.specs.resolution": "Resolution:",
    "settings.specs.uptime": "Uptime:",
    "specs.os": "FolioOS",
    "specs.build": "Build",
    "specs.browser": "Browser",
    "specs.resolution": "Resolution",
    "specs.uptime": "Uptime",
    "specs.copied": "Copied to clipboard!",

    // Settings About (Missing Keys)
    "settings.about.system": "System Info",
    "settings.about.env": "Environment",
    "settings.about.kernel": "Kernel",
    "settings.about.render": "Render Engine",
    "settings.about.browser": "Browser Engine",
    "settings.about.screen": "Screen Resolution",
    "settings.about.cores": "CPU Cores",
    "settings.about.memory": "Memory (Est.)",
    "settings.about.network": "Network Status",
    "settings.about.copy": "Copy Specs",
    "settings.about.copied": "Copied!",
    "settings.about.powered": "Powered By",
    "settings.dev": "Feature in development...",

    // Context Menu
    "menu.open": "Open/Focus",
    "menu.pin": "Pin to Taskbar",
    "menu.unpin": "Unpin from Taskbar",
    "menu.close": "Close Window",
    "menu.maximize": "Maximize",
    "menu.restore": "Restore",
    "menu.minimize": "Minimize",
    "menu.snap.left": "Snap Left",
    "menu.snap.right": "Snap Right",
    "menu.refresh": "Refresh",
    "menu.newfolder": "New Folder",
    "menu.wallpaper": "Change Wallpaper",
    "menu.align": "Organize Icons",
    "menu.about": "About System",
    "menu.doubleclick": "Double-click to open",
    "menu.itemdeleted": "Item deleted",
    "menu.openterminal": "Open Terminal",
    "menu.sort": "Sort by Name",
    "menu.personalize": "Personalize",
    "menu.displaysettings": "Display Settings",
    "menu.rename": "Rename",
    "menu.rename.prompt": "Enter new name:",
    "menu.properties": "Properties",

    // Messages / Notifications
    "msg.pinned": "Pinned to Taskbar",
    "msg.unpinned": "Unpinned from Taskbar",
    "msg.folder.impl": "New Folder not implemented (Simulation)",
    "msg.info": "Info",
    "msg.about.title": "Portfolio OS v1.0",
    "msg.about.desc": "A Web-based Operating System Simulation.",

    // Taskbar / Status
    "status.wifi": "Wi-Fi: Connected",
    "status.volume": "Volume",
    "status.battery": "Battery",
    "status.checking": "Checking...",
    "status.unknown": "Unknown",

    // Start Menu
    "start.menu": "Start",
    "start.visitor": "Visitor",
    "start.os": "Portfolio OS",
    "start.settings": "Settings",
    "start.shutdown": "Shut Down",
    "start.notifications": "Notifications",

    // Quick Settings
    "quicksettings.title": "Quick Settings",
    "quicksettings.theme.dark": "Dark",
    "quicksettings.theme.light": "Light",
    "quicksettings.effects": "Effects",
    "quicksettings.previews": "Previews",

    // Notepad
    "notepad.new": "New",
    "notepad.save": "Save",
    "notepad.saved": "Saved!",
    "notepad.newfile": "New File",
    "notepad.prompt": "Enter file name (e.g., notes.txt):",
    "notepad.savedto": "Saved to Desktop as",
    "notepad.placeholder": "Start typing...",
    "notepad.untitled": "Untitled.txt",

    // Terminal
    "terminal.welcome": "Welcome to FolioOS Terminal",
    "terminal.help": "Type 'help' to see available commands.",
    "terminal.notfound": "command not found",
    "terminal.help.desc": "Available commands:\n  help      Show this help message\n  clear     Clear terminal history\n  ls        List directory contents\n  cd [dir]  Change directory\n  cat [file] Read file content\n  echo [txt] Print text\n  pwd       Print working directory\n  whoami    Show current user\n  date      Show current date",
    "terminal.guest": "guest",
    "terminal.user": "user",
    "terminal.error.command": "command not found",
    "terminal.ls.error": "ls: cannot access",
    "terminal.cd.error": "cd: no such file or directory",
    "terminal.cd.notdir": "cd: not a directory",
    "terminal.cat.missing": "cat: missing operand",
    "terminal.cat.error": "cat: no such file or directory",
    "terminal.cat.isdir": "cat: is a directory",

    // Recycle Bin
    "recycle.empty": "Empty Bin",
    "recycle.restore": "Restore Selected",
    "recycle.items": "items",
    "recycle.empty.msg": "Recycle Bin is empty",
    "recycle.from": "From:",
    "recycle.unknown": "Unknown",
    "recycle.confirm": "Are you sure you want to permanently delete all items in the Recycle Bin?",

    // Calculator
    "calculator.error": "Error",
    "calculator.clear": "C",
    "calc.standard": "Standard",
    "calc.scientific": "Scientific",
    "calc.history": "History",
    "calc.no_history": "No History",

    // Contact
    "contact.new": "New Message",
    "contact.inbox": "Inbox",
    "contact.sent": "Sent Items",
    "contact.drafts": "Drafts",
    "contact.trash": "Trash",
    "contact.search": "Search",
    "contact.empty": "Nothing here yet",
    "contact.to": "To:",
    "contact.subj": "Subj:",
    "contact.subject": "Subject",
    "contact.type": "Type your message here...",
    "contact.discard": "Discard",
    "contact.send": "Send",
    "contact.select": "Select an item to read",
    "contact.no_subject": "(No Subject)",
    "contact.just_now": "Just now",
    "contact.welcome.subject": "Welcome to Portfolio OS",
    "contact.welcome.preview": "Thanks for visiting my digital workspace...",
    "contact.welcome.content": "Hi there,\n\nWelcome to Portfolio OS! This system was built to demonstrate advanced frontend capabilities using React, Next.js, and Three.js.\n\nFeel free to explore the file system, run commands in the terminal, or check out my projects in the Portfolio Hub.\n\nIf you'd like to get in touch, just hit \"Reply\" or compose a new message.\n\nBest regards,\nYume\nFull Stack Engineer",
    "contact.security.subject": "Security Alert: Login Detected",
    "contact.security.preview": "New login detected from your current location...",
    "contact.security.content": "New login session initialized.\n\nDevice: Web Browser\nLocation: Unknown Proxy\nIP: 127.0.0.1\n\nIf this wasn't you, well... it's a simulation, so don't worry about it.\n\n- SysAdmin",

    // Music Player
    "music.recommend": "Recommended for you",
    "music.eq": "Equalizer",
    "music.hall": "Music Hall",
    "music.video": "Video",
    "music.radio": "Radio",
    "music.likes": "Likes",
    "music.recent": "Recent",
    "music.local": "Local",
    "music.playlists": "CREATED PLAYLISTS",
    "music.search": "Search music...",
    "music.drop": "Drop audio files here to play",
    "music.my": "MY MUSIC",
    "music.localfile": "Local File",
    "music.uploads": "Uploads",
    "music.vip": "SVIP 7",
    "music.daily": "DAILY MIX",
    "music.fresh": "Fresh tracks curated for your coding session",
    "music.your_playlist": "Your Playlist",
    "music.show_all": "Show All >",
    "music.playlist.favorites": "My 2025 Favorites",
    "music.playlist.coding": "Late Night Coding",
    "music.playlist.gym": "Gym Motivation",
    "music.playlist.chill": "Chill Vibes",
    "music.playlist.new": "New Playlist 1",

    // Photo Gallery
    "gallery.library": "Library",
    "gallery.items": "items",
    "gallery.empty": "No photos found in /Pictures",

    // Browser
    "browser.newtab": "New Tab",
    "browser.loading": "Loading...",
    "browser.search": "Search Google or type a URL",
    "browser.real": "Open in real browser",
    "browser.tab": "Browser Tab",
    "browser.back": "Go Back",
    "browser.forward": "Go Forward",
    "browser.refresh": "Refresh",
    "browser.home": "Home",

    // VS Code Lite
    "vscode.file": "File",
    "vscode.edit": "Edit",
    "vscode.selection": "Selection",
    "vscode.view": "View",
    "vscode.go": "Go",
    "vscode.run": "Run",
    "vscode.terminal": "Terminal",
    "vscode.help": "Help",
    "vscode.explorer": "EXPLORER",
    "vscode.deleted": "Deleted",
    "vscode.welcome": "VS Code Lite",
    "vscode.start": "Select a file to start coding",
    "vscode.commands": "Show All Commands",
    "vscode.gofile": "Go to File",
    "vscode.save": "Save (Ctrl+S)",
    "vscode.runcode": "Run Code",
    "vscode.ln": "Ln",
    "vscode.col": "Col",
    "vscode.utf8": "UTF-8",
    "vscode.lang": "TypeScript React",
    "vscode.prettier": "Prettier",

    // File Explorer
    "explorer.root": "Root",
    "explorer.desktop": "Desktop",
    "explorer.documents": "Documents",
    "explorer.pictures": "Pictures",
    "explorer.downloads": "Downloads",
    "explorer.empty": "This folder is empty",

    // Common
    "common.name": "Name",
    "common.type": "Type",

    // Resume Content
    "resume.name": "YUME",
    "resume.title": "SENIOR SOFTWARE ENGINEER",
    "resume.location": "Cyberspace, Net",
    "resume.summary": "Highly decorated operative with extensive experience in full-stack development and interface design. Proven track record of delivering mission-critical systems under high pressure. Specialized in next-gen web technologies and immersive user experiences.",
    "resume.role.1": "SENIOR ENGINEER",
    "resume.company.1": "CYBER CORP LTD",
    "resume.desc.1": "Lead architect for distributed neural networks and core system infrastructure. Optimized rendering pipelines by 400%. Mentored junior operatives in secure coding practices.",
    "resume.role.2": "INTERFACE DESIGNER",
    "resume.company.2": "NEON STUDIOS",
    "resume.desc.2": "Designed immersive holographic interfaces for consumer-grade terminals. Awarded 'Best UX' in Sector 7. Implemented novel gesture recognition systems.",
    "resume.role.3": "FREELANCE MERC",
    "resume.company.3": "GLOBAL NET",
    "resume.desc.3": "Executed high-value contracts for various clients. Specializing in rapid prototyping and crisis management. Delivered 15+ successful projects.",
    "resume.degree.1": "MASTER OF COMPUTING",
    "resume.school.1": "VIRTUAL UNIVERSITY",
    "resume.skill.1": "System Architecture",
    "resume.skill.2": "UI/UX Design",
    "resume.skill.3": "Cyber Security",
    "resume.skill.4": "Cloud Infrastructure",
    "resume.present": "PRESENT",

    // Resume UI
    "resume.file": "resume.pdf",
    "resume.profile": "Profile",
    "resume.experience": "Experience",
    "resume.skills": "Skills",
    "resume.education": "Education",
    "resume.contact": "Contact",
    "resume.download": "Download",
    "resume.print": "Print",
    "resume.zoom": "Zoom"
  },
  zh: {
    // App Titles
    "app.portfolio-hub": "Portfolio Hub",
    "app.settings": "设置",
    "app.browser": "浏览器",
    "app.calculator": "计算器",
    "app.contact": "联系人",
    "app.file-explorer": "文件资源管理器",
    "app.music-player": "音乐播放器",
    "app.notepad": "记事本",
    "app.photo-gallery": "照片库",
    "app.recycle-bin": "回收站",
    "app.resume": "简历",
    "app.terminal": "终端",
    "app.weather": "天气",
    "app.vscode-lite": "VS Code",

    // Boot Sequence
    "boot.start": "点击启动",
    "boot.loading": "系统加载中...",
    "boot.ready": "系统就绪",
    "boot.init": "系统初始化...",
    "boot.memory": "检查内存...",
    "boot.kernel": "加载内核...",
    "boot.fs": "挂载文件系统...",
    "boot.uplink": "建立连接...",

    // Action Center
    "action.notifications": "通知中心",
    "action.clear": "清除全部",
    "action.empty": "暂无新通知",
    "action.system": "系统通知",

    // Settings Categories
    "settings.display": "显示",
    "settings.appearance": "外观",
    "settings.sound": "声音",
    "settings.language": "语言",
    "settings.account": "账户",
    "settings.privacy": "隐私",
    "settings.about": "关于",
    "settings.desc.display": "调整显示设置和主题",
    "settings.desc.appearance": "自定义颜色和视觉效果",
    "settings.desc.sound": "音量和通知设置",
    "settings.desc.language": "系统语言和区域设置",
    "settings.desc.account": "个人资料和账户信息",
    "settings.desc.privacy": "安全和隐私选项",
    "settings.desc.about": "系统信息和版本",

    // Files & Folders
    "file.welcome": "欢迎.txt",
    "file.about": "关于.md",
    "file.code.hello": "hello_world.ts",
    "file.code.component": "component.tsx",
    "folder.music": "音乐",
    "folder.code": "代码",

    // Settings Options
    "settings.display.theme": "主题模式",
    "settings.display.light": "浅色",
    "settings.display.dark": "深色",
    "settings.display.scale": "显示比例",
    "settings.display.scale.desc": "调整系统字体和窗口大小的缩放比例。",
    
    "settings.appearance.wallpaper": "桌面壁纸",
    "settings.appearance.accent": "主题色",
    "settings.appearance.effects": "视觉效果",
    "settings.appearance.transparency": "启用窗口透明与模糊效果",
    "settings.appearance.animations": "启用系统动画",
    "settings.appearance.previews": "启用任务栏窗口预览",
    "settings.appearance.skipboot": "跳过开机动画",
    "settings.appearance.icons": "图标风格",
    "settings.appearance.icons.filled": "现代 (填充)",
    "settings.appearance.icons.line": "经典 (线条)",

    "settings.sound.volume": "音量",
    "settings.language.select": "选择语言",

    "settings.about.system": "系统信息",

    "settings.about.env": "运行环境",
    "settings.about.kernel": "内核",
    "settings.about.render": "渲染引擎",
    "settings.about.browser": "浏览器内核",
    "settings.about.screen": "屏幕分辨率",
    "settings.about.cores": "处理器核心",
    "settings.about.memory": "运行内存 (预估)",
    "settings.about.network": "网络状态",
    "settings.about.uptime": "运行时间",
    "settings.about.copy": "复制配置信息",
    "settings.about.copied": "已复制!",
    "settings.about.dev": "开发者模式已开启!",
    "settings.about.powered": "技术栈驱动",
    "settings.dev": "功能开发中...",

    // Settings Specs
    "settings.specs.title": "系统规格:",
    "settings.specs.os": "FolioOS v1.0",
    "settings.specs.build": "版本: 2026.02.05",
    "settings.specs.browser": "浏览器:",
    "settings.specs.resolution": "分辨率:",
    "settings.specs.uptime": "运行时间:",
    "specs.os": "FolioOS",
    "specs.build": "版本",
    "specs.browser": "浏览器",
    "specs.resolution": "分辨率",
    "specs.uptime": "运行时间",
    "specs.copied": "已复制到剪贴板！",

    // Wallpaper & Colors
    "wallpaper.preset.flow": "默认流光",
    "wallpaper.preset.stars": "深邃星空",
    "wallpaper.preset.neon": "赛博霓虹",
    "wallpaper.preset.midnight": "午夜渐变",
    "wallpaper.image.daily": "每日壁纸",
    "wallpaper.image.snow": "雪山",
    "wallpaper.image.desert": "沙漠",
    "wallpaper.image.city": "城市",

    "color.cyan": "青色",
    "color.blue": "蓝色",
    "color.purple": "紫色",
    "color.pink": "粉色",
    "color.red": "红色",
    "color.orange": "橙色",
    "color.green": "绿色",

    // Context Menu
    "menu.open": "打开/聚焦",
    "menu.pin": "固定到任务栏",
    "menu.unpin": "取消固定",
    "menu.close": "关闭窗口",
    "menu.maximize": "最大化",
    "menu.restore": "还原",
    "menu.minimize": "最小化",
    "menu.snap.left": "左侧分屏",
    "menu.snap.right": "右侧分屏",
    "menu.refresh": "刷新",
    "menu.newfolder": "新建文件夹",
    "menu.wallpaper": "更换壁纸",
    "menu.align": "自动整理桌面图标",
    "menu.about": "关于系统",
    "menu.doubleclick": "双击以打开",
    "menu.itemdeleted": "项目已删除",
    "menu.openterminal": "打开终端",
    "menu.sort": "按名称排序",
    "menu.personalize": "个性化",
    "menu.displaysettings": "显示设置",
    "menu.rename": "重命名",
    "menu.rename.prompt": "输入新名称:",
    "menu.properties": "属性",

    // Messages / Notifications
    "msg.pinned": "已固定到任务栏",
    "msg.unpinned": "已取消固定",
    "msg.folder.impl": "新建文件夹功能尚未实现 (模拟)",
    "msg.info": "提示",
    "msg.about.title": "FolioOS v1.0",
    "msg.about.desc": "一个基于 Web 技术的操作系统模拟界面。",

    // Taskbar / Status
    "status.wifi": "Wi-Fi: 已连接",
    "status.volume": "音量",
    "status.battery": "电池",
    "status.checking": "检查中...",
    "status.unknown": "未知",
    "status.checking": "检查中...",
    "status.unknown": "未知",

    // Gallery Images
    "gallery.image.img-1": "抽象 01",
    "gallery.image.img-2": "赛博城市",
    "gallery.image.img-3": "工作空间",


    // Start Menu
    "start.menu": "开始",
    "start.visitor": "访客",
    "start.os": "Portfolio OS",
    "start.settings": "设置",
    "start.shutdown": "关机",
    "start.notifications": "通知",

    // Quick Settings
    "quicksettings.title": "快速设置",
    "quicksettings.theme.dark": "深色",
    "quicksettings.theme.light": "浅色",
    "quicksettings.effects": "特效",
    "quicksettings.previews": "预览",

    // Notepad
    "notepad.new": "新建",
    "notepad.opened": "文件已打开",
    "notepad.save": "保存",
    "notepad.saved": "已保存!",
    "notepad.newfile": "新建文件",
    "notepad.prompt": "输入文件名 (例如: notes.txt):",
    "notepad.savedto": "已保存到桌面:",
    "notepad.placeholder": "开始输入...",
    "notepad.untitled": "未命名.txt",

    // Terminal
    "terminal.welcome": "欢迎使用 FolioOS 终端",
    "terminal.help": "输入 'help' 查看可用命令。",
    "terminal.notfound": "命令未找到",

    // Resume Content
    "resume.name": "YUME",
    "resume.title": "高级软件工程师",
    "resume.location": "网络空间",
    "resume.summary": "拥有丰富全栈开发和界面设计经验的资深特工。在由于高压环境下交付关键任务系统的良好记录。专注于下一代 Web 技术和沉浸式用户体验。",
    "resume.role.1": "高级工程师",
    "resume.company.1": "赛博科技集团",
    "resume.desc.1": "分布式神经网络和核心系统基础设施的首席架构师。优化渲染管线效率提升 400%。指导初级特工的安全编码实践。",
    "resume.role.2": "界面设计师",
    "resume.company.2": "霓虹工作室",
    "resume.desc.2": "为消费级终端设计沉浸式全息界面。荣获第七区“最佳用户体验”奖。实现了新型手势识别系统。",
    "resume.role.3": "自由雇佣兵",
    "resume.company.3": "全球网络",
    "resume.desc.3": "为各种客户执行高价值合同。专注于快速原型设计和危机管理。交付了 15+ 个成功项目。",
    "resume.degree.1": "计算机硕士",
    "resume.school.1": "虚拟大学",
    "resume.skill.1": "系统架构",
    "resume.skill.2": "UI/UX 设计",
    "resume.skill.3": "网络安全",
    "resume.skill.4": "云基础设施",
    "resume.present": "至今",

    // Resume UI
    "resume.file": "简历.pdf",
    "resume.profile": "个人简介",
    "resume.experience": "工作经历",
    "resume.skills": "技能专长",
    "resume.education": "教育背景",
    "resume.contact": "联系方式",
    "resume.download": "下载",
    "resume.print": "打印",
    "resume.zoom": "缩放",
    "terminal.help.desc": "可用命令:\n  help      显示此帮助信息\n  clear     清空终端历史\n  ls        列出目录内容\n  cd [dir]  切换目录\n  cat [file] 读取文件内容\n  echo [txt] 打印文本\n  pwd       打印当前工作目录\n  whoami    显示当前用户\n  date      显示当前日期",
    "terminal.guest": "访客",
    "terminal.user": "用户",
    "terminal.error.command": "命令未找到",
    "terminal.ls.error": "ls: 无法访问",
    "terminal.cd.error": "cd: 没有那个文件或目录",
    "terminal.cd.notdir": "cd: 不是目录",
    "terminal.cat.missing": "cat: 缺少操作数",
    "terminal.cat.error": "cat: 没有那个文件或目录",
    "terminal.cat.isdir": "cat: 是一个目录",

    // Recycle Bin
    "recycle.empty": "清空回收站",
    "recycle.restore": "还原选中项",
    "recycle.items": "项",
    "recycle.empty.msg": "回收站为空",
    "recycle.from": "原位置:",
    "recycle.unknown": "未知",
    "recycle.confirm": "确定要永久删除回收站中的所有项目吗？",

    // Calculator
    "calculator.error": "错误",
    "calculator.clear": "C",
    "calc.standard": "标准",
    "calc.scientific": "科学",
    "calc.history": "历史记录",
    "calc.no_history": "暂无历史记录",

    // Contact
    "contact.new": "新建消息",
    "contact.inbox": "收件箱",
    "contact.sent": "已发送",
    "contact.drafts": "草稿箱",
    "contact.trash": "垃圾箱",
    "contact.search": "搜索",
    "contact.empty": "暂无内容",
    "contact.to": "收件人:",
    "contact.subj": "主题:",
    "contact.subject": "主题",
    "contact.type": "在此输入消息内容...",
    "contact.discard": "放弃",
    "contact.send": "发送",
    "contact.select": "选择一项以阅读",
    "contact.no_subject": "(无主题)",
    "contact.just_now": "刚刚",
    "contact.welcome.subject": "欢迎来到 Portfolio OS",
    "contact.welcome.preview": "感谢访问我的数字工作空间...",
    "contact.welcome.content": "你好，\n\n欢迎来到 Portfolio OS！构建此系统是为了展示使用 React、Next.js 和 Three.js 的高级前端功能。\n\n请随意探索文件系统，在终端中运行命令，或在 Portfolio Hub 中查看我的项目。\n\n如果你想联系我，只需点击“回复”或撰写新消息。\n\n致以最诚挚的问候，\nYume\n全栈工程师",
    "contact.security.subject": "安全警报：检测到登录",
    "contact.security.preview": "从您当前位置检测到新的登录...",
    "contact.security.content": "新登录会话已初始化。\n\n设备：Web 浏览器\n位置：未知代理\nIP：127.0.0.1\n\n如果这不是你，好吧... 这只是一个模拟，所以不用担心。\n\n- 系统管理员",

    // Music Player
    "music.recommend": "推荐",
    "music.hall": "音乐馆",
    "music.video": "视频",
    "music.radio": "电台",
    "music.likes": "我喜欢的",
    "music.recent": "最近播放",
    "music.local": "本地音乐",
    "music.playlists": "创建的歌单",
    "music.search": "搜索音乐...",
    "music.drop": "拖拽音频文件到此处播放",
    "music.my": "我的音乐",
    "music.localfile": "本地文件",
    "music.uploads": "上传",
    "music.vip": "SVIP 7",
    "music.daily": "每日推荐",
    "music.fresh": "为你编程时刻精选的曲目",
    "music.your_playlist": "你的歌单",
    "music.show_all": "查看全部 >",
    "music.playlist.favorites": "2025 我喜欢的音乐",
    "music.playlist.coding": "深夜编程",
    "music.playlist.gym": "健身动力",
    "music.playlist.chill": "放松氛围",
    "music.playlist.new": "新建歌单 1",

    // Photo Gallery
    "gallery.library": "图库",
    "gallery.items": "项",
    "gallery.empty": "在 /Pictures 中未找到照片",

    // Browser
    "browser.newtab": "新标签页",
    "browser.loading": "加载中...",
    "browser.search": "搜索 Google 或输入网址",
    "browser.real": "在真实浏览器中打开",
    "browser.tab": "浏览器标签页",
    "browser.back": "后退",
    "browser.forward": "前进",
    "browser.refresh": "刷新",
    "browser.home": "主页",

    // VS Code Lite
    "vscode.file": "文件",
    "vscode.edit": "编辑",
    "vscode.selection": "选择",
    "vscode.view": "查看",
    "vscode.go": "前往",
    "vscode.run": "运行",
    "vscode.terminal": "终端",
    "vscode.help": "帮助",
    "vscode.explorer": "资源管理器",
    "vscode.deleted": "已删除",
    "vscode.welcome": "VS Code Lite",
    "vscode.start": "选择一个文件以开始编码",
    "vscode.commands": "显示所有命令",
    "vscode.gofile": "前往文件",
    "vscode.save": "保存 (Ctrl+S)",
    "vscode.runcode": "运行代码",
    "vscode.ln": "行",
    "vscode.col": "列",
    "vscode.utf8": "UTF-8",
    "vscode.lang": "TypeScript React",
    "vscode.prettier": "Prettier",

    // File Explorer
    "explorer.root": "根目录",
    "explorer.desktop": "桌面",
    "explorer.documents": "文档",
    "explorer.pictures": "图片",
    "explorer.downloads": "下载",
    "explorer.empty": "此文件夹为空",

    // Common
    "common.name": "名称",
    "common.type": "类型",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');

  useEffect(() => {
    const savedLang = localStorage.getItem('portfolio_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLanguage(savedLang);
    } else {
      setLanguage('zh')
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('portfolio_lang', lang);
  };

  const toggleLanguage = () => {
    handleSetLanguage(language === 'en' ? 'zh' : 'en');
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
