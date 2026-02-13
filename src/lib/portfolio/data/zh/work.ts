import { WorkItem } from '../../types'

export const WORK_ITEMS_ZH: WorkItem[] = [
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
