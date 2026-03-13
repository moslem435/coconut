
import { System, ThemeMode } from '@/os/sdk';
import { SYSTEM_PATHS } from '@/os/config/paths';
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore';

// Define the tool structure expected by OpenAI/WebLLM
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}

type ToolContext = {
    mode?: 'chat' | 'control' | 'builder';
};

const hashToHue = (input: string) => {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return Math.abs(h) % 360
}

const getInitials = (name: string) => {
    const s = (name || '').trim()
    if (!s) return 'A'
    const compact = s.replace(/\s+/g, ' ')
    const parts = compact.split(' ').filter((p): p is string => Boolean(p))
    const take = (str: string) => Array.from(str)[0] || ''
    if (parts.length >= 2) return (take(parts[0] || '') + take(parts[1] || '')).toUpperCase()
    const chars = Array.from(compact.replace(/[^0-9A-Za-z\u4e00-\u9fff]/g, ''))
    if (chars.length >= 2) return ((chars[0] || '') + (chars[1] || '')).toUpperCase()
    return (chars[0] || take(compact) || 'A').toUpperCase()
}

const looksLikeEmoji = (icon: string) => {
    const s = (icon || '').trim()
    if (!s) return false
    if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return false
    const chars = Array.from(s)
    return chars.length > 0 && chars.length <= 3
}

const generateIconSvg = (name: string, title: string, icon: string) => {
    const hue = hashToHue(name || title || 'app')
    const hue2 = (hue + 48) % 360
    const text = looksLikeEmoji(icon) ? icon.trim() : getInitials(title || name)
    const fontSize = looksLikeEmoji(icon) ? 160 : 132
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 85% 55%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 85% 55%)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="128" fill="url(#g)"/>
  <text x="256" y="274" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="${fontSize}" font-weight="700" fill="#ffffff">${text}</text>
</svg>`
}

// Map of function names to their implementations
export const systemToolsImplementation: Record<string, Function> = {
    // --- Scaffolding ---
    scaffold_static_app: async (args: { name: string, title: string, icon: string }) => {
        const { name, title, icon } = args;
        const appPath = `${SYSTEM_PATHS.USER}/apps/${name}`;

        try {
            await System.fs.createDirectory(appPath);
            const usesLucide = (icon || '').trim().toLowerCase().startsWith('lucide:')
            const displayIcon = looksLikeEmoji(icon) ? icon : getInitials(title || name)

            // 1. index.html (MUST be created BEFORE package.json!)
            // Reason: package.json with cocount triggers isAppBundle detection,
            // which causes UI components to immediately try reading index.html.
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- Modern Stack: Tailwind + Alpine.js + Lucide -->
    <script defer src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://unpkg.com/lucide@latest"></script>
    
    <!-- Theme Config -->
    <script>
        tailwind.config = {
            darkMode: 'media',
            theme: {
                extend: {
                    colors: {
                        border: "hsl(var(--border))",
                        background: "hsl(var(--background))",
                        foreground: "hsl(var(--foreground))",
                        primary: "hsl(var(--primary))",
                        secondary: "hsl(var(--secondary))",
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --border: 214.3 31.8% 91.4%;
            --primary: 221.2 83.2% 53.3%;
            --secondary: 210 40% 96.1%;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --background: 222.2 84% 4.9%;
                --foreground: 210 40% 98%;
                --border: 217.2 32.6% 17.5%;
                --primary: 217.2 91.2% 59.8%;
                --secondary: 217.2 32.6% 17.5%;
            }
        }
        body { 
            background-color: hsl(var(--background)); 
            color: hsl(var(--foreground));
        }
    </style>
</head>
<body class="h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:24px_24px]">

    <div x-data="{ count: 0 }" class="w-[90%] max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
        <!-- Top accent -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <i data-lucide="zap" class="w-3 h-3"></i> Static App
        </div>

        <div class="text-5xl mb-4 animate-bounce inline-block">${displayIcon}</div>
        
        <h1 class="text-3xl font-bold mb-3 tracking-tight">${title}</h1>
        <p class="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
            Minimalist template with <b>Tailwind</b> & <b>Alpine.js</b>. No build steps required.
        </p>

        <div class="flex justify-center gap-3">
            <button 
                @click="count++"
                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95"
            >
                <i data-lucide="mouse-pointer-2" class="w-4 h-4 mr-2"></i>
                Clicked: <span x-text="count" class="ml-1"></span>
            </button>
        </div>

        <div class="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 font-mono">
            index.html
        </div>
    </div>

    <!-- Initialize Icons -->
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            try {
                (lucide && lucide.createIcons) && lucide.createIcons();
            } catch {}
        });
    </script>
</body>
</html>`;
            console.log(`[SystemTools] Writing index.html, length: ${html.length}`);
            await System.fs.writeFile(`${appPath}/index.html`, html);

            await System.fs.writeFile(`${appPath}/icon.svg`, generateIconSvg(name, title, icon));

            // 2. package.json (LAST! triggers isAppBundle detection)
            const pkgJson = {
                name: name,
                version: "1.0.0",
                cocount: {
                    type: "web-static",
                    icon: usesLucide ? icon : "./icon.svg",
                    window: { title, width: 800, height: 600 }
                }
            };
            await System.fs.writeFile(`${appPath}/package.json`, JSON.stringify(pkgJson, null, 2));

            // Wait for VFS state to fully propagate
            await new Promise(r => setTimeout(r, 200));

            return `Static app '${name}' created at ${appPath}. You can now add business logic to index.html.`;
        } catch (e: any) {
            return `Failed to scaffold static app: ${e.message}`;
        }
    },

    scaffold_react_app: async (args: { name: string, title: string, icon: string }) => {
        const { name, title, icon } = args;
        const appPath = `${SYSTEM_PATHS.USER}/apps/${name}`;

        try {
            await System.fs.createDirectory(appPath);
            await System.fs.createDirectory(`${appPath}/src`);
            await System.fs.createDirectory(`${appPath}/public`);
            await System.fs.createDirectory(`${appPath}/src/lib`);
            await System.fs.createDirectory(`${appPath}/src/components`);
            await System.fs.createDirectory(`${appPath}/src/components/ui`);

            // Create ALL files BEFORE package.json!
            // Reason: package.json with cocount triggers isAppBundle detection,
            // which causes UI components to immediately try reading other files.

            // 0. jsconfig.json (for path aliases)
            const jsConfig = `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}`;
            await System.fs.writeFile(`${appPath}/jsconfig.json`, jsConfig);

            await System.fs.writeFile(`${appPath}/icon.svg`, generateIconSvg(name, title, icon));

            // 1. vite.config.js
            const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
})`;
            await System.fs.writeFile(`${appPath}/vite.config.js`, viteConfig);

            // 2. tailwind.config.js (v3)
            const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}`;
            await System.fs.writeFile(`${appPath}/tailwind.config.js`, tailwindConfig);

            // 3. postcss.config.js
            const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
            await System.fs.writeFile(`${appPath}/postcss.config.js`, postcssConfig);

            // 4. index.html
            const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
            await System.fs.writeFile(`${appPath}/index.html`, indexHtml);

            // 5. src/main.jsx
            const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
            await System.fs.writeFile(`${appPath}/src/main.jsx`, mainJsx);

            // 6. src/index.css
            const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
 
    --primary: 24.6 95% 53.1%;
    --primary-foreground: 210 40% 98%;
 
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
 
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
 
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
 
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
 
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
 
    --primary: 24.6 95% 53.1%;
    --primary-foreground: 222.2 47.4% 11.2%;
 
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
 
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
 
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
 
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
 
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', sans-serif;
  }
}`; 
            await System.fs.writeFile(`${appPath}/src/index.css`, indexCss);

            // 7. src/lib/utils.js
            const utilsJs = `import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}`;
            await System.fs.writeFile(`${appPath}/src/lib/utils.js`, utilsJs);

            // 8. src/App.jsx (Starter Template with Routing and Animation)
            const appJsx = `import { useState } from 'react'
import { Sparkles, Terminal, Cpu, Zap, ArrowRight, Home } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full flex items-center justify-center p-8 bg-dot-pattern">
        <AnimatedRoutes />
      </div>
    </Router>
  )
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function HomePage() {
  const [count, setCount] = useState(0)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="card w-full max-w-3xl overflow-hidden bg-card border border-border shadow-xl rounded-xl"
    >
      {/* Header Strip */}
      <div className="h-2 w-full bg-gradient-to-r from-primary to-orange-400" />
      
      <div className="p-10 md:p-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8 border border-primary/20">
          <Sparkles size={14} /> System Ready
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-foreground">
          ${title}
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
          AI-Ready React Template. Features standardized infrastructure, Shadcn UI compatibility, and modern tooling.
        </p>

        <div className="flex justify-center gap-4 mb-16">
          <button 
            onClick={() => setCount(c => c + 1)}
            className={cn(
              "inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all duration-200",
              "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20 group"
            )}
          >
            <Zap size={18} className="mr-2 group-hover:fill-current transition-all" />
            Interactive: {count}
          </button>
          <Link 
            to="/docs"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Documentation <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        {/* Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <Feature 
            icon={<Terminal size={20} />}
            title="Infrastructure"
            desc="Alias paths (@/), Router, and Utils pre-configured."
          />
          <Feature 
            icon={<Cpu size={20} />}
            title="Performance"
            desc="Vite 5 + React 18 optimized build setup."
          />
          <Feature 
            icon={<Sparkles size={20} />}
            title="Styling"
            desc="Tailwind CSS with CSS variables for theming."
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-muted/30 p-4 text-center text-xs text-muted-foreground border-t border-border font-mono">
        src/App.jsx
      </div>
    </motion.div>
  )
}

function DocsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="card w-full max-w-3xl overflow-hidden bg-card border border-border shadow-xl rounded-xl p-10"
    >
       <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 rounded-full hover:bg-muted transition-colors">
          <Home size={24} />
        </Link>
        <h2 className="text-3xl font-bold">Documentation</h2>
       </div>
       
       <div className="space-y-6 text-muted-foreground">
         <p>This template is designed to be "AI-Friendly".</p>
         <ul className="list-disc pl-5 space-y-2">
           <li><strong>Path Aliases:</strong> Use <code>@/components</code> or <code>@/lib/utils</code> imports.</li>
           <li><strong>Utils:</strong> Use <code>cn()</code> for conditional classes.</li>
           <li><strong>Routing:</strong> React Router is set up in <code>App.jsx</code>.</li>
           <li><strong>Styling:</strong> CSS Variables in <code>index.css</code> control the theme.</li>
         </ul>
       </div>
    </motion.div>
  )
}

function Feature({ icon, title, desc }) {
  return (
    <div className="p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3 text-foreground">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

export default App`;
            await System.fs.writeFile(`${appPath}/src/App.jsx`, appJsx);

            // 9. package.json (LAST! triggers isAppBundle detection)
            const pkgJson = {
                name: name,
                version: "1.0.0",
                private: true,
                type: "module",
                scripts: {
                    "dev": "vite",
                    "build": "vite build",
                    "preview": "vite preview"
                },
                dependencies: {
                    "react": "^18.3.1",
                    "react-dom": "^18.3.1",
                    "react-router-dom": "^6.22.3",
                    "lucide-react": "^0.344.0",
                    "clsx": "^2.1.0",
                    "tailwind-merge": "^2.2.1",
                    "framer-motion": "^11.0.8"
                },
                devDependencies: {
                    "vite": "^5.1.4",
                    "@vitejs/plugin-react": "^4.2.1",
                    "tailwindcss": "^3.4.1",
                    "postcss": "^8.4.35",
                    "autoprefixer": "^10.4.18",
                    "typescript": "^5.3.3",
                    "@types/react": "^18.2.43",
                    "@types/react-dom": "^18.2.17",
                    "@types/node": "^20.11.24" 
                },
                cocount: {
                    type: "web-container",
                    icon: (icon || '').trim().toLowerCase().startsWith('lucide:') ? icon : "./icon.svg",
                    window: { title, width: 1000, height: 800 }
                }
            };
            await System.fs.writeFile(`${appPath}/package.json`, JSON.stringify(pkgJson, null, 2));

            // Wait for VFS state to fully propagate
            await new Promise(r => setTimeout(r, 200));

            return `App "${title}" created successfully. Click the icon on your desktop or in File Explorer to launch it.`;
        } catch (e: any) {
            return `Failed to scaffold React app: ${e.message}`;
        }
    },

    // --- System Settings ---
    set_theme: (args: { mode: ThemeMode }) => {
        System.settings.setTheme(args.mode);
        return `Theme set to ${args.mode}`;
    },

    set_wallpaper: (args: { url: string }) => {
        System.settings.setWallpaper(args.url);
        return `Wallpaper set to image: ${args.url}`;
    },

    set_volume: (args: { level: number }) => {
        const volume = Math.max(0, Math.min(100, args.level));
        System.settings.setVolume(volume);
        return `Volume set to ${volume}%`;
    },

    get_system_status: () => {
        const settings = System.settings.getSettings();
        const processes = System.process.list();

        return JSON.stringify({
            theme: settings.theme,
            volume: settings.volume,
            running_apps: processes.length,
            wallpaper: settings.wallpaper.type
        });
    },

    // --- App Management ---
    launch_app: (args: { appId: string, params?: any }) => {
        const { appId, params } = args;
        const windowId = System.process.launch(appId, params);
        return `Launched app: ${appId} (Window ID: ${windowId})`;
    },

    close_app: (args: { windowId: string }) => {
        System.window.close(args.windowId);
        return `Closed window: ${args.windowId}`;
    },

    get_running_apps: () => {
        const apps = System.process.list().map(p => ({
            pid: p.pid,
            name: p.name,
            windowId: p.windowId
        }));
        return JSON.stringify(apps);
    },

    // --- File System ---
    create_directory: async (args: { path: string }) => {
        try {
            await System.fs.createDirectory(args.path);
            return `Directory created at '${args.path}'`;
        } catch (e: any) {
            // If error is "Path exists but is not a directory", it's an error.
            // If it already exists as a folder, System.fs.createDirectory returns the id, so no error thrown usually?
            // Let's check System.fs implementation: it throws "Path exists but is not a directory".
            // If it is a folder, it returns node.id.
            // So we are good.
            return `Error creating directory: ${e.message || e}`;
        }
    },

    create_file: async (args: { path: string, content: string }) => {
        try {
            // console.log(`[SystemTools] create_file: writing to '${args.path}', length: ${args.content?.length}`);
            if (!args.content) {
                console.warn(`[SystemTools] create_file: Warning - content is empty for '${args.path}'`);
            }
            if (args.path?.endsWith('package.json')) {
                try {
                    JSON.parse(args.content || '');
                } catch (e: any) {
                    return `Error creating file: package.json must be valid JSON (${e.message || e})`;
                }
            }
            await System.fs.writeFile(args.path, args.content);

            return `File created at '${args.path}'`;
        } catch (e: any) {
            console.error(`[SystemTools] create_file error:`, e);
            return `Error creating file: ${e.message || e}`;
        }
    },

    list_directory: (args: { path: string }) => {
        try {
            const files = System.fs.readDir(args.path);
            return JSON.stringify(files.map(f => f.name));
        } catch (e) {
            return `Error listing directory: ${e}`;
        }
    },

    read_file: async (args: { path: string }) => {
        try {
            const content = await System.fs.readFile(args.path);
            return content;
        } catch (e: any) {
            return `Error reading file: ${e.message || e}`;
        }
    },

    update_file: async (args: { path: string; content: string }) => {
        try {
            if (args.path?.endsWith('package.json')) {
                try {
                    JSON.parse(args.content || '');
                } catch (e: any) {
                    return `Error updating file: package.json must be valid JSON (${e.message || e})`;
                }
            }
            await System.fs.writeFile(args.path, args.content);
            return `File updated at '${args.path}'`;
        } catch (e: any) {
            return `Error updating file: ${e.message || e}`;
        }
    },

    replace_in_file: async (args: { path: string; find: string; replace: string; expectedCount?: number; regex?: boolean; flags?: string; replaceAll?: boolean }) => {
        try {
            const original = await System.fs.readFile(args.path);
            const useRegex = !!args.regex;
            const replaceAll = args.replaceAll !== false;

            let next = original;
            let count = 0;

            if (useRegex) {
                const inputFlags = args.flags || '';
                const flags = inputFlags.includes('g') ? inputFlags : `${inputFlags}g`;
                const re = new RegExp(args.find, flags);

                const matches = original.match(re);
                count = matches ? matches.length : 0;

                if (!replaceAll && count > 0) {
                    const nonGlobalFlags = flags.replace(/g/g, '');
                    const reOnce = new RegExp(args.find, nonGlobalFlags);
                    next = original.replace(reOnce, args.replace);
                    count = 1;
                } else {
                    next = original.replace(re, args.replace);
                }
            } else {
                if (!args.find) {
                    return `Error: 'find' must be non-empty for literal replacement.`;
                }
                if (!replaceAll) {
                    const idx = original.indexOf(args.find);
                    if (idx === -1) {
                        count = 0;
                        next = original;
                    } else {
                        count = 1;
                        next = original.slice(0, idx) + args.replace + original.slice(idx + args.find.length);
                    }
                } else {
                    let idx = 0;
                    while (true) {
                        const found = original.indexOf(args.find, idx);
                        if (found === -1) break;
                        count++;
                        idx = found + args.find.length;
                    }
                    next = count > 0 ? original.split(args.find).join(args.replace) : original;
                }
            }

            if (typeof args.expectedCount === 'number' && count !== args.expectedCount) {
                return `No changes applied. Expected ${args.expectedCount} matches but found ${count}.`;
            }
            if (count === 0) {
                return `No changes applied. Found 0 matches.`;
            }

            await System.fs.writeFile(args.path, next);
            return `Replaced ${count} occurrence(s) in '${args.path}'.`;
        } catch (e: any) {
            return `Error replacing in file: ${e.message || e}`;
        }
    },

    // --- Execution ---
    run_command: async (args: { cmd: string, args?: string[], cwd?: string, detached?: boolean, successPattern?: string }, ctx?: ToolContext) => {
        if (ctx?.mode === 'builder' && args.cmd === 'npm') {
            const joined = (args.args || []).join(' ').toLowerCase()
            const isInstall = /\b(install|i|ci)\b/.test(joined)
            const isDevLike = /\b(run\s+dev|dev|start|serve|watch)\b/.test(joined)
            if (isInstall || isDevLike) {
                return `Skipped: Command '${args.cmd} ${args.args?.join(' ') || ''}' is disabled during build. Please run the app by double-clicking it in File Explorer (or explicitly ask to run/launch).`
            }
        }

        // Prevent running long-running processes that would timeout (unless detached mode is requested)
        const longRunningCommands = ['dev', 'start', 'watch', 'serve'];
        if (args.cmd === 'npm' && args.args && args.args.some(arg => longRunningCommands.includes(arg)) && !args.detached) {
            return `Command '${args.cmd} ${args.args.join(' ')}' skipped. Long-running processes (like dev servers) block execution. To run this, you MUST set "detached": true in the arguments.`;
        }

        let output = '';

        try {
            // Ensure WebContainer is ready
            const store = useWebContainerStore.getState();
            if (!store.instance) {
                try {
                    await store.boot();
                    // Double check after boot
                    if (!store.instance && !useWebContainerStore.getState().instance) {
                        return `Failed to initialize WebContainer. Please refresh the page and try again.`;
                    }
                } catch (bootError: any) {
                    // Check if it's a session conflict
                    if (bootError.message && bootError.message.includes('session conflict')) {
                        return `WebContainer initialization conflict detected. Please refresh the page to reset the environment, then try again.`;
                    }
                    return `Failed to initialize WebContainer: ${bootError.message || bootError}`;
                }
            }

            // Track the last output length when we dispatched a prompt
            // This allows us to detect new prompts after user responds
            let lastPromptOutputLength = 0;

            // Dispatch a custom event to notify UI about the output stream
            // This is a temporary solution until we have a proper streaming tool response architecture
            const dispatchOutput = (data: string) => {
                // Strip ANSI escape codes (colors, cursor movements, etc.)
                // eslint-disable-next-line no-control-regex
                const cleanData = data.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

                output += cleanData;
                window.dispatchEvent(new CustomEvent('ai-builder:command-output', {
                    detail: { cmd: args.cmd, output: cleanData }
                }));

                // Skip if output hasn't grown significantly since last prompt
                // This prevents duplicate triggers for the same prompt
                if (output.length - lastPromptOutputLength < 10) return;

                // Heuristic detection for interactive prompts
                // Check the FULL output (not just the current chunk) for better detection
                const trimmed = cleanData.trim();
                const fullOutput = output;
                const fullOutputTrimmed = fullOutput.trim();
                const fullOutputLower = fullOutput.toLowerCase();

                // 1. Detect prompt patterns (questions, colons, prompts)
                const hasPromptPattern =
                    fullOutputTrimmed.endsWith('?') ||
                    fullOutputTrimmed.endsWith(':') ||
                    fullOutputTrimmed.endsWith('?:') || // Vite uses "?:"
                    fullOutputTrimmed.endsWith('>') ||
                    fullOutputTrimmed.endsWith('...') || // Waiting indicator
                    // Yes/No confirmations (case insensitive)
                    /\(y\/n\)/i.test(fullOutput) ||
                    /\[y\/n\]/i.test(fullOutput) ||
                    /\(yes\/no\)/i.test(fullOutput) ||
                    /\[yes\/no\]/i.test(fullOutput) ||
                    /\[y\/n\]/i.test(fullOutput) ||
                    // Selection prompts
                    fullOutputLower.includes('select a') ||
                    fullOutputLower.includes('select an') ||
                    fullOutputLower.includes('choose a') ||
                    fullOutputLower.includes('choose an') ||
                    fullOutputLower.includes('please select') ||
                    fullOutputLower.includes('please choose') ||
                    fullOutputLower.includes('pick a') ||
                    fullOutputLower.includes('which') ||
                    // Input prompts
                    fullOutputLower.includes('enter your') ||
                    fullOutputLower.includes('enter a') ||
                    fullOutputLower.includes('enter the') ||
                    fullOutputLower.includes('type your') ||
                    fullOutputLower.includes('provide a') ||
                    fullOutputLower.includes('input') ||
                    // Common field names
                    fullOutputLower.includes('package name:') ||
                    fullOutputLower.includes('project name:') ||
                    fullOutputLower.includes('name:') ||
                    fullOutputLower.includes('version:') ||
                    fullOutputLower.includes('description:') ||
                    fullOutputLower.includes('author:') ||
                    fullOutputLower.includes('license:') ||
                    fullOutputLower.includes('dest dir:') ||
                    fullOutputLower.includes('directory:') ||
                    // Password/sensitive input
                    fullOutputLower.includes('password:') ||
                    fullOutputLower.includes('passphrase:') ||
                    fullOutputLower.includes('token:') ||
                    fullOutputLower.includes('secret:') ||
                    // Framework/tool specific
                    fullOutputLower.includes('use vite') ||
                    fullOutputLower.includes('framework:') ||
                    fullOutputLower.includes('template:') ||
                    fullOutputLower.includes('variant:') ||
                    // Special characters used by modern CLIs
                    fullOutputLower.includes('◆') || // Vite
                    fullOutputLower.includes('◇') || // Alternative
                    fullOutputLower.includes('●') || // Bullet
                    fullOutputLower.includes('○') || // Circle
                    fullOutputLower.includes('▸') || // Arrow
                    fullOutputLower.includes('❯') || // Prompt arrow
                    fullOutputLower.includes('›'); // Right arrow

                // 2. Check for option markers (visual indicators of choices)
                const hasOptions = /[○●•❯›│▸◆◇]\s+/g.test(output);

                // 3. Check for numbered options (1. Option, 1) Option, [1] Option)
                const hasNumberedOptions = /^\s*[\[\(]?\d+[\.\)\]]\s+\w+/m.test(output);

                // 4. Check for text input prompts (where no options might be present)
                const isTextInputPrompt =
                    /project name:|package name:|enter your|enter a|enter the|name:|version:|description:|author:|license:|dest dir:|directory:|password:|passphrase:|token:|secret:/i.test(fullOutputTrimmed);

                // 5. Check for waiting state (output ends with colon or prompt and hasn't grown)
                const looksLikeWaiting =
                    (fullOutputTrimmed.endsWith(':') || fullOutputTrimmed.endsWith('>')) &&
                    output.length > 20 &&
                    output.length < 500;

                // 6. Content length check (reasonable size for a prompt)
                const hasReasonableContent = output.length > 20 && output.length < 3000;

                // Debug logging
                if (hasPromptPattern || hasOptions || hasNumberedOptions || isTextInputPrompt || looksLikeWaiting) {
                    console.log('[SystemTools] Prompt detection check:', {
                        hasPromptPattern,
                        hasOptions,
                        hasNumberedOptions,
                        isTextInputPrompt,
                        looksLikeWaiting,
                        hasReasonableContent,
                        outputLength: output.length,
                        lastLine: fullOutputTrimmed.split('\n').pop()?.slice(-100)
                    });
                }

                // Trigger interactive prompt if any of these conditions are met:
                // 1. Prompt pattern + options (visual or numbered)
                // 2. Text input prompt detected
                // 3. Looks like waiting for input
                // 4. Prompt pattern + reasonable content (not too short, not too long)
                const shouldTrigger =
                    (hasPromptPattern && (hasOptions || hasNumberedOptions)) ||
                    isTextInputPrompt ||
                    looksLikeWaiting ||
                    (hasPromptPattern && hasReasonableContent);

                if (shouldTrigger) {
                    // Update the last prompt output length to allow future prompts
                    lastPromptOutputLength = output.length;

                    console.log('[SystemTools] ✅ Interactive prompt detected!');
                    console.log('[SystemTools] Full output:', output);

                    // Extract the prompt line (usually the last non-empty line)
                    const lines = fullOutputTrimmed.split('\n').filter(l => l.trim());
                    const promptLine = lines[lines.length - 1] || trimmed;

                    window.dispatchEvent(new CustomEvent('ai-builder:interactive-prompt', {
                        detail: {
                            cmd: args.cmd,
                            prompt: promptLine,
                            output: output
                        }
                    }));
                }
            };

            // Create a timeout promise (60 seconds for most commands)
            const timeoutMs = 60000;
            const timeoutPromise = new Promise<number>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds. The command may be waiting for user input or taking too long.`));
                }, timeoutMs);
            });

            // Race between command execution and timeout
            let exitCode = -1;
            try {
                exitCode = await Promise.race([
                    store.runCommand(
                        args.cmd,
                        args.args || [],
                        args.cwd || '/',
                        dispatchOutput,
                        {
                            detached: args.detached,
                            successPattern: args.successPattern
                        }
                    ),
                    timeoutPromise
                ]);
            } catch (cmdError: any) {
                // WebContainer / npx fallback: file system might not have fully flushed bin symlinks yet
                const isNpxError = args.cmd === 'npx' && (
                    output.includes('could not determine executable to run') ||
                    cmdError.message?.includes('exit code 1')
                );

                if (isNpxError && args.args && args.args.length > 0) {
                    console.log(`[SystemTools] npx execution failed (possibly timing). Retrying in 2 seconds...`);

                    // Wait 2 seconds for WebContainer file system to settle
                    await new Promise(r => setTimeout(r, 2000));

                    output = ''; // Reset output buffer
                    console.log(`[SystemTools] Retrying original npx command...`);

                    const retryTimeoutPromise = new Promise<number>((_, reject) => {
                        setTimeout(() => {
                            reject(new Error(`Fallback command timed out after ${timeoutMs / 1000} seconds.`));
                        }, timeoutMs);
                    });

                    exitCode = await Promise.race([
                        store.runCommand(
                            args.cmd,
                            args.args,
                            args.cwd || '/',
                            dispatchOutput,
                            {
                                detached: args.detached,
                                successPattern: args.successPattern
                            }
                        ),
                        retryTimeoutPromise
                    ]);
                } else {
                    throw cmdError;
                }
            }

            // After command completes successfully, sync WebContainer to VFS
            if (exitCode === 0) {
                console.log(`[SystemTools] Command succeeded, syncing WC to VFS...`);
                try {
                    // Always sync from root to catch all changes
                    // This is especially important for commands like "npm create vite"
                    // which create new directories
                    await store.syncWCToVFS('/');
                    console.log(`[SystemTools] ✅ Sync complete`);
                } catch (syncError) {
                    console.warn(`[SystemTools] Sync failed:`, syncError);
                }

                if (args.detached) {
                    return `Process started successfully in background.\nInitial Output:\n${output.slice(0, 2000)}`;
                }
                return `Command executed successfully.\nOutput:\n${output.slice(0, 1000)}${output.length > 1000 ? '...(truncated)' : ''}`;
            } else {
                return `Command failed with exit code ${exitCode}.\nOutput:\n${output.slice(0, 1000)}`;
            }
        } catch (e: any) {
            // Include output in error message if available
            // This is crucial for commands that fail but output useful stderr info
            const outputInfo = (output && output.length > 0) ? `\nOutput before failure:\n${output.slice(0, 1000)}` : '';

            // Check if it's a timeout error
            if (e.message && e.message.includes('timed out')) {
                return `Error: ${e.message}${outputInfo}\n\nTip: Avoid interactive commands. Use non-interactive alternatives (e.g., 'npm init -y' instead of 'npm init', or add '-y' flag to skip prompts).`;
            }

            return `Error running command: ${e.message || e}${outputInfo}`;
        }
    },

    get_file_tree: (args: { path: string, depth?: number }) => {
        try {
            // Basic recursive listing (simplified for now)
            // In real implementation we might want a tree structure
            const files = System.fs.readDir(args.path);
            return JSON.stringify(files.map(f => f.name));
        } catch (e) {
            const p = typeof args?.path === 'string' ? args.path : '';
            if (p && String(e).includes('Directory not found:')) {
                const parts = p.split('/').filter(Boolean);
                const base = parts[parts.length - 1] || '';
                if (base && p === `${SYSTEM_PATHS.USER}/${base}`) {
                    const candidate = `${SYSTEM_PATHS.USER}/apps/${base}`;
                    if (System.fs.exists(candidate)) {
                        try {
                            const files = System.fs.readDir(candidate);
                            return `Directory not found: ${p}. Using: ${candidate}\n${JSON.stringify(files.map(f => f.name))}`;
                        } catch {}
                    }
                }
            }
            return `Error getting file tree: ${e}`;
        }
    }
};

// Definitions for the LLM
export const systemToolsDefinitions: ToolDefinition[] = [
    // --- Scaffold Tools ---
    {
        type: 'function',
        function: {
            name: 'scaffold_static_app',
            description: 'Create a lightweight static web app (HTML/CSS/JS) with NO build steps. FASTEST way to build. Supports Tailwind via CDN and modern ES6+. Use this for: landing pages, tools, games, dashboards, and any single-page app that doesn\'t strictly require React/NPM.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'App folder name (e.g., "calculator"). lowercase, no spaces.'
                    },
                    title: {
                        type: 'string',
                        description: 'App window title (e.g., "Simple Calculator")'
                    },
                    icon: {
                        type: 'string',
                        description: 'Emoji icon for the app (e.g., "🧮")'
                    }
                },
                required: ['name', 'title', 'icon']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'scaffold_react_app',
            description: 'ONLY use if the user EXPLICITLY requests React, complex state management, or specific NPM packages. This requires a slow "npm install" process.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'App folder name (e.g., "todo-list"). lowercase, no spaces.'
                    },
                    title: {
                        type: 'string',
                        description: 'App window title (e.g., "Advanced Todo")'
                    },
                    icon: {
                        type: 'string',
                        description: 'Emoji icon for the app (e.g., "✅")'
                    }
                },
                required: ['name', 'title', 'icon']
            }
        }
    },
    // --- System Settings ---
    {
        type: 'function',
        function: {
            name: 'set_theme',
            description: 'Set the system theme mode (light or dark)',
            parameters: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['light', 'dark'] }
                },
                required: ['mode']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_wallpaper',
            description: 'Set the desktop wallpaper from a URL',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The image URL' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_volume',
            description: 'Set the system volume level (0-100)',
            parameters: {
                type: 'object',
                properties: {
                    level: { type: 'number', minimum: 0, maximum: 100 }
                },
                required: ['level']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_system_status',
            description: 'Get current system status (theme, volume, running apps)',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'launch_app',
            description: 'Launch an application by its ID',
            parameters: {
                type: 'object',
                properties: {
                    appId: {
                        type: 'string',
                        description: 'The application ID. Available apps: "vscode-lite" (Code Editor), "terminal" (Terminal), "file-explorer" (Files), "settings" (Settings), "portfolio-hub" (Portfolio), "notepad" (Text Editor), "music-player" (Music), "photo-gallery" (Photos), "weather" (Weather), "task-manager" (Task Manager), "ai-chat" (AI Assistant), "code-runner" (Code Runner), "yume" (Dream Log), "emulator" (Game Emulator).'
                    },
                    params: { type: 'object', description: 'Optional parameters to pass to the app' }
                },
                required: ['appId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'close_app',
            description: 'Close an application window',
            parameters: {
                type: 'object',
                properties: {
                    windowId: { type: 'string' }
                },
                required: ['windowId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_running_apps',
            description: 'List all running applications and processes',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_directory',
            description: 'Create a new directory (folder) in the file system',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: `The directory path (e.g. "${SYSTEM_PATHS.USER}/apps/my-app")` }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_file',
            description: 'Create a file in the file system',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path' },
                    content: { type: 'string', description: 'The file content' }
                },
                required: ['path', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List files in a directory',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The directory path' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the content of an existing file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path to read' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_file',
            description: 'Overwrite an existing file with new content',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path to update' },
                    content: { type: 'string', description: 'The new file content' }
                },
                required: ['path', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'replace_in_file',
            description: 'Replace text inside an existing file without rewriting the entire file content. Prefer this for small, targeted edits to save tokens.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The file path to update' },
                    find: { type: 'string', description: 'String to find (literal) OR regex pattern if regex=true' },
                    replace: { type: 'string', description: 'Replacement text' },
                    expectedCount: { type: 'number', description: 'Optional safety check: expected number of matches' },
                    regex: { type: 'boolean', description: 'If true, treat find as a RegExp pattern' },
                    flags: { type: 'string', description: 'RegExp flags (e.g. "gmi"). "g" is always enabled when regex=true unless replaceAll=false' },
                    replaceAll: { type: 'boolean', description: 'If false, replace only the first match (default: true)' }
                },
                required: ['path', 'find', 'replace']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a shell command in the WebContainer environment. For long-running processes (like dev servers), use "detached": true. CRITICAL: Commands MUST be non-interactive and complete within 60 seconds (unless detached). NEVER use: "npm create vite" (interactive), "npm init" (use "npm init -y"), or any command that waits for user input.',
            parameters: {
                type: 'object',
                properties: {
                    cmd: { type: 'string', description: 'The command to run (e.g., "npm")' },
                    args: { type: 'array', items: { type: 'string' }, description: 'Arguments for the command (e.g., ["install", "react"])' },
                    cwd: { type: 'string', description: 'Current working directory for the command (e.g. "/home/user/apps/myapp")' },
                    detached: { type: 'boolean', description: 'Set to true for long-running processes (e.g. npm run dev). Returns early after detecting successPattern.' },
                    successPattern: { type: 'string', description: 'String to watch for in output to confirm successful start in detached mode (default: "Local:")' }
                },
                required: ['cmd']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_file_tree',
            description: 'Get a list of files in a directory (shallow)',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The directory path' }
                },
                required: ['path']
            }
        }
    }
];

export const TOOL_CATEGORIES = {
    chat: [],
    control: [
        'set_theme',
        'set_wallpaper',
        'set_volume',
        'get_system_status',
        'launch_app',
        'close_app',
        'get_running_apps'
    ],
    filesystem: [
        'create_directory',
        'create_file',
        'read_file',
        'update_file',
        'replace_in_file',
        'run_command',
        'get_file_tree'
    ],
    builder: [
        'scaffold_static_app',
        'scaffold_react_app',
        'create_directory',
        'create_file',
        'read_file',
        'update_file',
        'replace_in_file',
        'run_command',
        'get_file_tree',
        'list_directory'
    ]
};
