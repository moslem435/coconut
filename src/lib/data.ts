import { Github, Twitter, Mail, Linkedin } from 'lucide-react'

// Types
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
  icon: any
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

// ENGLISH DATA
const PROJECTS_EN: Project[] = [
  {
    id: "01",
    title: "PROJECT",
    category: "SELECTED_WORKS",
    year: "2024",
    description: "A curated collection of digital experiments, commercial applications, and interactive experiences. Exploring the boundaries of web technology and visual storytelling.",
    stats: ["Next.js", "WebGL", "React Native", "Design"],
    color: "#00ffff",
    accent: "#ff00ff"
  },
  {
    id: "02",
    title: "ABOUT",
    category: "PERSONAL_FILE",
    year: "EST.199X",
    description: "Creative Developer & UI/UX Designer. Specializing in building immersive web interfaces with a focus on performance, accessibility, and motion. Based in the Digital Realm.",
    stats: ["Contact", "GitHub", "Twitter", "Mail"],
    color: "#ffffff",
    accent: "#505050"
  },
  {
    id: "03",
    title: "LOGS",
    category: "THOUGHT_STREAM",
    year: "LIVE",
    description: "A stream of consciousness, technical notes, and observations from the field. Updates are sporadic and unedited.",
    stats: ["Writing", "Rants", "Notes", "Ideas"],
    color: "#ffff00",
    accent: "#ff0000"
  },
  {
    id: "04",
    title: "LAB",
    category: "EXPERIMENTAL_UNIT",
    year: "BETA",
    description: "A playground for visual research, shader experiments, and unfinished prototypes. Proceed with caution. High probability of instability.",
    stats: ["Shaders", "Prototypes", "Sketches", "WIP"],
    color: "#ff0055",
    accent: "#00ff00"
  },
  {
    id: "05",
    title: "RADIO",
    category: "AUDIO_WAVES",
    year: "LIVE",
    description: "Encrypted audio transmission. Broadcasting lofi beats, synthwave, and white noise for coding sessions.",
    stats: ["Music", "Playlist", "Vibe", "Noise"],
    color: "#ff5500",
    accent: "#ffaa00"
  },
  {
    id: "06",
    title: "CONTACT",
    category: "UPLINK_NODE",
    year: "ALWAYS_ON",
    description: "Establish a secure connection. Available for freelance inquiries, collaborations, and encrypted messaging.",
    stats: ["Email", "Socials", "Form", "Ping"],
    color: "#00ffaa",
    accent: "#00cc88"
  },
  {
    id: "07",
    title: "RESUME",
    category: "PERSONNEL_FILE",
    year: "UPDATED",
    description: "Access classified personnel records. Comprehensive history of missions, skills, and certifications.",
    stats: ["CV", "History", "Skills", "PDF"],
    color: "#aa00ff",
    accent: "#cc44ff"
  },
  {
    id: "08",
    title: "SERVICES",
    category: "CONTRACTS",
    year: "OPEN",
    description: "Available for tactical deployment. Web development, UI design, and technical consultation services.",
    stats: ["Web", "Mobile", "Design", "Consult"],
    color: "#ffffff",
    accent: "#cccccc"
  }
]

const SKILLS_EN: Skill[] = [
  { label: "REACT / NEXT.JS", level: 49, color: "bg-cyan-400" },
  { label: "TYPESCRIPT", level: 47, color: "bg-blue-500" },
  { label: "TAILWIND / CSS", level: 46, color: "bg-sky-400" },
  { label: "UI / UX DESIGN", level: 45, color: "bg-pink-500" },
  { label: "FRAMER MOTION", level: 44, color: "bg-indigo-400" },
  { label: "WEBGL / THREE.JS", level: 42, color: "bg-purple-500" },
  { label: "JAVA", level: 42, color: "bg-red-500" },
  { label: "GOLANG", level: 42, color: "bg-cyan-500" },
  { label: "PYTHON", level: 42, color: "bg-blue-400" },
  { label: "CLOUD NATIVE", level: 42, color: "bg-indigo-500" },
  { label: "GIT / DEVOPS", level: 41, color: "bg-orange-400" },
  { label: "NODE / BACKEND", level: 40, color: "bg-green-400" },
  { label: "RUST", level: 40, color: "bg-orange-600" },
  { label: "SQL / DATABASE", level: 37, color: "bg-yellow-400" }
]

const EXPERIENCE_EN: Experience[] = [
  { year: "2024", event: "SYSTEM_UPGRADE -> SENIOR_DEV", status: "COMPLETE" },
  { year: "2023", event: "DEPLOYED_CORE_MODULES", status: "SUCCESS" },
  { year: "2022", event: "INITIATED_NEURAL_LINK", status: "STABLE" },
  { year: "2021", event: "BOOT_SEQUENCE_ALPHA", status: "ARCHIVED" },
  { year: "2020", event: "FREELANCE_OPERATIVE", status: "OFFLINE" },
  { year: "2019", event: "ACADEMY_TRAINING_COMPLETE", status: "GRADUATED" },
  { year: "2018", event: "INTERNSHIP_V1.0", status: "EXECUTED" },
]

const ARSENAL_EN: ArsenalItem[] = [
  { name: "VS Code", category: "IDE" },
  { name: "Figma", category: "DESIGN" },
  { name: "Blender", category: "3D" },
  { name: "Cursor", category: "AI_OPS" },
  { name: "Docker", category: "DEVOPS" },
  { name: "Linear", category: "PM" },
]

const SERVICES_EN = [
  "Creative Development",
  "Interactive 3D Web",
  "Technical Direction",
  "UI/UX Design",
  "Performance Optimization"
]

const LOGS_EN: LogItem[] = [
  {
    id: "L_01",
    title: "THE_FUTURE_OF_WEBGL",
    date: "2024-02-15",
    tags: ["WebGL", "Performance", "Rant"],
    content: "WebGL is not just for flashy demos anymore. With the advent of WebGPU, we're seeing a paradigm shift in how we render graphics on the web. It's time to stop thinking about the DOM and start thinking about the canvas."
  },
  {
    id: "L_02",
    title: "DESIGN_SYSTEMS_IN_CHAOS",
    date: "2024-01-20",
    tags: ["Design", "System", "Philosophy"],
    content: "Order is overrated. Some of the best digital experiences come from controlled chaos. How do we build design systems that allow for expression while maintaining consistency? The answer lies in flexible constraints."
  },
  {
    id: "L_03",
    title: "REACT_SERVER_COMPONENTS",
    date: "2023-12-10",
    tags: ["React", "Next.js", "Backend"],
    content: "The mental model shift required for RSC is significant, but the payoff is immense. We are essentially blurring the line between client and server, allowing for a more unified development experience."
  }
]

const WORK_ITEMS_EN: WorkItem[] = [
  {
    id: "P_01",
    title: "NEON_GENESIS",
    type: "OPEN_WORLD_RPG",
    year: "2024",
    desc: "A dystopian open-world RPG set in a decaying mega-city. Features a custom engine for real-time raytraced neon lighting and a branching narrative system.",
    stack: ["Unreal Engine 5", "C++", "HLSL"],
    color: "from-cyan-500 to-blue-600"
  },
  {
    id: "P_02",
    title: "VOID_WALKER",
    type: "METROIDVANIA",
    year: "2023",
    desc: "Hand-drawn 2D action platformer exploring themes of isolation. Implements a unique gravity-manipulation mechanic and procedural map generation.",
    stack: ["Unity", "C#", "FMOD"],
    color: "from-white to-slate-400"
  },
  {
    id: "P_03",
    title: "ECHO_GARDEN",
    type: "AUDIO_VISUAL",
    year: "2022",
    desc: "A meditative gardening simulator where plants grow based on sound frequencies. Utilizes WebAudio API for procedural music generation.",
    stack: ["Three.js", "React", "WebAudio"],
    color: "from-green-400 to-emerald-600"
  },
  {
    id: "P_04",
    title: "IRON_HEART",
    type: "TACTICAL_SIM",
    year: "2021",
    desc: "Turn-based tactical strategy game focusing on diesel-punk mechs. Features a complex damage simulation system.",
    stack: ["Godot", "Rust", "Vulkan"],
    color: "from-orange-500 to-red-600"
  }
]

const LAB_ITEMS_EN: LabItem[] = [
  {
    id: "EXP_01",
    title: "FLUID_SIM_01",
    type: "WEBGL",
    date: "2024.02",
    color: "#00ff88"
  },
  {
    id: "EXP_02",
    title: "RAYMARCHING_TEST",
    type: "SHADER",
    date: "2024.01",
    color: "#ff0055"
  },
  {
    id: "EXP_03",
    title: "PARTICLE_NOISE",
    type: "CANVAS",
    date: "2023.12",
    color: "#00ccff"
  },
  {
    id: "EXP_04",
    title: "TYPOGRAPHY_MORPH",
    type: "CSS/JS",
    date: "2023.11",
    color: "#ffcc00"
  },
  {
    id: "EXP_05",
    title: "AUDIO_REACTIVE",
    type: "WEB_AUDIO",
    date: "2023.10",
    color: "#ff00ff"
  },
  {
    id: "EXP_06",
    title: "PHYSICS_ENGINE",
    type: "RAPIER",
    date: "2023.09",
    color: "#ffffff"
  }
]


// CHINESE DATA
const PROJECTS_ZH: Project[] = [
  {
    id: "01",
    title: "项目",
    category: "精选作品",
    year: "2024",
    description: "数字实验、商业应用和交互体验的精选集。探索Web技术和视觉叙事的边界。",
    stats: ["Next.js", "WebGL", "React Native", "设计"],
    color: "#00ffff",
    accent: "#ff00ff"
  },
  {
    id: "02",
    title: "关于",
    category: "个人档案",
    year: "EST.199X",
    description: "创意开发者 & UI/UX 设计师。专注于构建具有高性能、无障碍和丰富动效的沉浸式Web界面。常驻数字领域。",
    stats: ["联系", "GitHub", "Twitter", "邮件"],
    color: "#ffffff",
    accent: "#505050"
  },
  {
    id: "03",
    title: "日志",
    category: "思维流",
    year: "LIVE",
    description: "意识流、技术笔记和即时观察。更新不定，未经编辑。",
    stats: ["写作", "吐槽", "笔记", "灵感"],
    color: "#ffff00",
    accent: "#ff0000"
  },
  {
    id: "04",
    title: "实验室",
    category: "实验单元",
    year: "BETA",
    description: "视觉研究、着色器实验和未完成原型的游乐场。小心进入。极不稳定。",
    stats: ["Shaders", "原型", "草图", "WIP"],
    color: "#ff0055",
    accent: "#00ff00"
  },
  {
    id: "05",
    title: "电台",
    category: "音频波段",
    year: "LIVE",
    description: "加密音频传输。播放 Lofi 节拍、Synthwave 和白噪音，专为编程时段设计。",
    stats: ["音乐", "歌单", "氛围", "噪音"],
    color: "#ff5500",
    accent: "#ffaa00"
  },
  {
    id: "06",
    title: "联络",
    category: "上行节点",
    year: "ALWAYS_ON",
    description: "建立安全连接。接受自由职业咨询、合作邀请和加密信息。",
    stats: ["邮件", "社交", "表单", "Ping"],
    color: "#00ffaa",
    accent: "#00cc88"
  },
  {
    id: "07",
    title: "履历",
    category: "人员档案",
    year: "UPDATED",
    description: "访问机密人员记录。包含任务历史、技能评估和认证资质的完整档案。",
    stats: ["CV", "历史", "技能", "PDF"],
    color: "#aa00ff",
    accent: "#cc44ff"
  },
  {
    id: "08",
    title: "服务",
    category: "合约任务",
    year: "OPEN",
    description: "可进行战术部署。提供 Web 开发、UI 设计和技术咨询服务。",
    stats: ["Web", "移动端", "设计", "咨询"],
    color: "#ffffff",
    accent: "#cccccc"
  }
]

const SKILLS_ZH: Skill[] = [
  { label: "REACT / NEXT.JS", level: 49, color: "bg-cyan-400" },
  { label: "TYPESCRIPT", level: 47, color: "bg-blue-500" },
  { label: "TAILWIND / CSS", level: 46, color: "bg-sky-400" },
  { label: "UI / UX DESIGN", level: 45, color: "bg-pink-500" },
  { label: "FRAMER MOTION", level: 44, color: "bg-indigo-400" },
  { label: "WEBGL / THREE.JS", level: 42, color: "bg-purple-500" },
  { label: "JAVA", level: 42, color: "bg-red-500" },
  { label: "GOLANG", level: 42, color: "bg-cyan-500" },
  { label: "PYTHON", level: 42, color: "bg-blue-400" },
  { label: "CLOUD NATIVE", level: 42, color: "bg-indigo-500" },
  { label: "GIT / DEVOPS", level: 41, color: "bg-orange-400" },
  { label: "NODE / BACKEND", level: 40, color: "bg-green-400" },
  { label: "RUST", level: 40, color: "bg-orange-600" },
  { label: "SQL / DATABASE", level: 37, color: "bg-yellow-400" }
]

const EXPERIENCE_ZH: Experience[] = [
  { year: "2024", event: "系统升级 -> 高级开发", status: "完成" },
  { year: "2023", event: "部署核心模块", status: "成功" },
  { year: "2022", event: "神经连接初始化", status: "稳定" },
  { year: "2021", event: "启动序列 Alpha", status: "归档" },
  { year: "2020", event: "自由职业行动", status: "离线" },
  { year: "2019", event: "学院训练完成", status: "毕业" },
  { year: "2018", event: "实习计划 V1.0", status: "执行" },
]

const ARSENAL_ZH: ArsenalItem[] = [
  { name: "VS Code", category: "IDE" },
  { name: "Figma", category: "设计" },
  { name: "Blender", category: "三维" },
  { name: "Cursor", category: "智能辅助" },
  { name: "Docker", category: "运维" },
  { name: "Linear", category: "项目管理" },
]

const SERVICES_ZH = [
  "创意开发",
  "交互式 3D Web",
  "技术指导",
  "UI/UX 设计",
  "性能优化"
]

const LOGS_ZH: LogItem[] = [
  {
    id: "L_01",
    title: "WEBGL 的未来",
    date: "2024-02-15",
    tags: ["WebGL", "性能", "随笔"],
    content: "WebGL 不再只是为了炫酷的演示。随着 WebGPU 的到来，我们正见证 Web 图形渲染范式的转变。是时候停止思考 DOM，开始思考 Canvas 了。"
  },
  {
    id: "L_02",
    title: "混沌中的设计系统",
    date: "2024-01-20",
    tags: ["设计", "系统", "哲学"],
    content: "秩序被高估了。一些最好的数字体验来自于受控的混乱。我们如何构建既允许表达又保持一致性的设计系统？答案在于灵活的约束。"
  },
  {
    id: "L_03",
    title: "REACT SERVER COMPONENTS",
    date: "2023-12-10",
    tags: ["React", "Next.js", "后端"],
    content: "RSC 所需的心智模型转变是巨大的，但回报也是巨大的。我们本质上是在模糊客户端和服务器之间的界限，从而实现更统一的开发体验。"
  }
]

const WORK_ITEMS_ZH: WorkItem[] = [
  {
    id: "P_01",
    title: "霓虹创世纪",
    type: "开放世界 RPG",
    year: "2024",
    desc: "一个设定在衰败巨型城市的反乌托邦开放世界 RPG。拥有自定义引擎实现的实时光线追踪霓虹灯光和分支叙事系统。",
    stack: ["Unreal Engine 5", "C++", "HLSL"],
    color: "from-cyan-500 to-blue-600"
  },
  {
    id: "P_02",
    title: "虚空行者",
    type: "银河恶魔城",
    year: "2023",
    desc: "探索孤独主题的手绘风 2D 动作平台游戏。实现了独特的重力操控机制和程序化地图生成。",
    stack: ["Unity", "C#", "FMOD"],
    color: "from-white to-slate-400"
  },
  {
    id: "P_03",
    title: "回声花园",
    type: "音视互动",
    year: "2022",
    desc: "一个冥想式的园艺模拟器，植物根据声音频率生长。利用 WebAudio API 进行程序化音乐生成。",
    stack: ["Three.js", "React", "WebAudio"],
    color: "from-green-400 to-emerald-600"
  },
  {
    id: "P_04",
    title: "钢铁之心",
    type: "战术模拟",
    year: "2021",
    desc: "专注于柴油朋克机甲的回合制战术策略游戏。拥有复杂的伤害模拟系统。",
    stack: ["Godot", "Rust", "Vulkan"],
    color: "from-orange-500 to-red-600"
  }
]

// Shared items (no translation needed yet)
export const SOCIAL_LINKS = [
  { icon: Github, label: "GH_REPO", href: "https://github.com" },
  { icon: Twitter, label: "TW_FEED", href: "https://twitter.com" },
  { icon: Mail, label: "MAIL_Relay", href: "mailto:hello@example.com" }
]

// Data dictionary
export const DATA = {
  en: {
    PROJECTS: PROJECTS_EN,
    SKILLS: SKILLS_EN,
    EXPERIENCE: EXPERIENCE_EN,
    ARSENAL: ARSENAL_EN,
    SERVICES: SERVICES_EN,
    LOGS: LOGS_EN,
    WORK_ITEMS: WORK_ITEMS_EN,
    LAB_ITEMS: LAB_ITEMS_EN
  },
  zh: {
    PROJECTS: PROJECTS_ZH,
    SKILLS: SKILLS_ZH,
    EXPERIENCE: EXPERIENCE_ZH,
    ARSENAL: ARSENAL_ZH,
    SERVICES: SERVICES_ZH,
    LOGS: LOGS_ZH,
    WORK_ITEMS: WORK_ITEMS_ZH,
    LAB_ITEMS: LAB_ITEMS_EN // Reuse EN for Lab items for now
  }
}

// Default exports for backward compatibility (will be deprecated once components are updated)
export const PROJECTS = PROJECTS_EN
export const SKILLS = SKILLS_EN
export const EXPERIENCE = EXPERIENCE_EN
export const ARSENAL = ARSENAL_EN
export const SERVICES = SERVICES_EN
export const LOGS = LOGS_EN
export const WORK_ITEMS = WORK_ITEMS_EN
export const LAB_ITEMS = LAB_ITEMS_EN
