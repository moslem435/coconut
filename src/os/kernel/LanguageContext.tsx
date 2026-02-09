"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'zh';

// Translation Dictionary
const translations = {
  en: {
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
    
    // Settings Options
    "settings.theme": "Theme Mode",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.scale": "Display Scale",
    "settings.scale.desc": "Adjust the scaling of system fonts and windows.",
    "settings.wallpaper": "Wallpaper",
    "settings.accent": "Accent Color",
    "settings.visuals": "Visual Effects",
    "settings.transparency": "Enable Transparency & Blur",
    "settings.animations": "Enable System Animations",
    "settings.previews": "Enable Taskbar Previews",
    "settings.volume": "Volume",
    
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
    "menu.align": "Align to Grid",
    "menu.about": "About System",
    
    // Messages / Notifications
    "msg.pinned": "Pinned to Taskbar",
    "msg.unpinned": "Unpinned from Taskbar",
    "msg.folder.impl": "New Folder not implemented (Simulation)",
    "msg.info": "Info",
    "msg.about.title": "Portfolio OS v1.0",
    "msg.about.desc": "A Web-based Operating System Simulation.",
    
    // Boot Sequence
    "boot.init": "SYSTEM INITIALIZATION",
    "boot.memory": "CHECKING MEMORY...",
    "boot.kernel": "LOADING KERNEL...",
    "boot.fs": "MOUNTING FILESYSTEM...",
    "boot.uplink": "ESTABLISHING UPLINK...",
    "boot.ready": "SYSTEM READY",
    "boot.loading": "SYSTEM LOADING",

    // Taskbar / Status
    "status.wifi": "Wi-Fi: Connected",
    "status.volume": "Volume",
    "status.battery": "Battery",

    // Start Menu
    "start.visitor": "Visitor",
    "start.os": "Portfolio OS",
    "start.settings": "Settings",
    "start.shutdown": "Shut Down",
    
    // Settings App
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
    "settings.desc.account": "Profile and account info",
    "settings.desc.privacy": "Security and privacy options",
    "settings.desc.about": "System info and version",
    
    "settings.display.theme": "Theme Mode",
    "settings.display.light": "Light",
    "settings.display.dark": "Dark",
    "settings.display.scale": "Display Scale",
    "settings.display.scale.desc": "Adjust system font and window size scaling.",
    
    "settings.appearance.wallpaper": "Desktop Wallpaper",
    "settings.appearance.accent": "Accent Color",
    "settings.appearance.effects": "Visual Effects",
    "settings.appearance.transparency": "Enable Transparency & Blur",
    "settings.appearance.animations": "Enable System Animations",
    "settings.appearance.previews": "Enable Taskbar Previews",
    "settings.appearance.skipboot": "Skip Boot Sequence",
    
    "settings.sound.volume": "Volume",
    
    "settings.language.select": "Select Language",
    
    "settings.about.system": "System Info",
    "settings.about.env": "Environment",
    "settings.about.kernel": "Kernel",
    "settings.about.render": "Render Engine",
    "settings.dev": "Feature under development...",

    // Wallpaper & Colors
    "wallpaper.preset.flow": "Default Flow",
    "wallpaper.preset.stars": "Deep Space",
    "wallpaper.preset.neon": "Cyber Neon",
    "wallpaper.preset.midnight": "Midnight Gradient",
    "wallpaper.image.daily": "Daily Wallpaper",
    "wallpaper.image.snow": "Snow Mountain",
    "wallpaper.image.desert": "Desert",
    "wallpaper.image.city": "City",
    
    "color.cyan": "Cyan",
    "color.blue": "Blue",
    "color.purple": "Purple",
    "color.pink": "Pink",
    "color.red": "Red",
    "color.orange": "Orange",
    "color.green": "Green"
  },
  zh: {
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

    "settings.sound.volume": "音量",

    "settings.language.select": "选择语言",

    "settings.about.system": "系统信息",
    "settings.about.env": "运行环境",
    "settings.about.kernel": "内核",
    "settings.about.render": "渲染引擎",
    "settings.dev": "功能开发中...",

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
    "menu.align": "自动排列",
    "menu.about": "关于系统",
    
    // Messages / Notifications
    "msg.pinned": "已固定到任务栏",
    "msg.unpinned": "已取消固定",
    "msg.folder.impl": "新建文件夹功能尚未实现 (模拟)",
    "msg.info": "提示",
    "msg.about.title": "Portfolio OS v1.0",
    "msg.about.desc": "一个基于 Web 技术的操作系统模拟界面。",
    
    // Boot Sequence
    "boot.init": "系统初始化...",
    "boot.memory": "检查内存...",
    "boot.kernel": "加载内核...",
    "boot.fs": "挂载文件系统...",
    "boot.uplink": "建立连接...",
    "boot.ready": "系统就绪",
    "boot.loading": "系统加载中",

    // Taskbar / Status
    "status.wifi": "Wi-Fi: 已连接",
    "status.volume": "音量",
    "status.battery": "电池",

    // Start Menu
    "start.visitor": "访客",
    "start.os": "Portfolio OS",
    "start.settings": "设置",
    "start.shutdown": "关机"
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
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese as per request implication or previous context, or sticking to 'en' default but user asked for adaptation. Let's keep 'zh' default for now since user is speaking Chinese? Or check localStorage.

  // Optional: Persist to localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('portfolio_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLanguage(savedLang);
    } else {
        // Default to browser language or 'zh' since user is asking for adaptation
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
