import { WorkItem } from '../../types'

export const WORK_ITEMS_EN: WorkItem[] = [
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
