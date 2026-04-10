
import { System, ThemeMode } from '@/os/sdk';
import { SYSTEM_PATHS } from '@/os/config/paths';
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore';
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore';
import { AstTools } from './astTools';

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

const normalizePath = (p: string): string => {
    if (!p) return p;
    // If the path looks like it should be in /home/user/apps but is missing the prefix
    if (p.startsWith('/') && !p.startsWith('/home') && !p.startsWith('/Trash') && !p.startsWith('/rom')) {
        const parts = p.split('/').filter(Boolean);
        if (parts.length === 1) {
            const candidate = `/home/user/apps/${parts[0]}`;
            // We can't easily check exists synchronously here without a try/catch in the caller,
            // but for LLM convenience, we can try to be smart.
            return candidate;
        }
    }
    return p;
};

// Map of function names to their implementations
export const systemToolsImplementation: Record<string, Function> = {
    /**
     * Validates the syntax of all JS/TS/JSX/TSX files in a given directory.
     * Useful for post-generation checks to ensure no syntax errors were introduced.
     */
    validate_app_code: async (args: { path: string }) => {
        const path = normalizePath(args.path);
        const results: { file: string; status: 'ok' | 'error'; message?: string }[] = [];

        const scan = async (dir: string) => {
            try {
                const entries = System.fs.readDir(dir);
                for (const entry of entries) {
                    const fullPath = `${dir}/${entry.name}`;
                    if (entry.type === 'directory') {
                        await scan(fullPath);
                    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
                        try {
                            const content = await System.fs.readFile(fullPath, 'utf8');
                            const { parse } = require('@babel/parser');
                            parse(content, {
                                sourceType: 'module',
                                plugins: ['jsx', 'typescript']
                            });
                            results.push({ file: fullPath, status: 'ok' });
                        } catch (e: any) {
                            results.push({ 
                                file: fullPath, 
                                status: 'error', 
                                message: `Syntax Error at line ${e.loc?.line}, col ${e.loc?.column}: ${e.message}` 
                            });
                        }
                    }
                }
            } catch {}
        };

        try {
            await scan(path);
            const errors = results.filter(r => r.status === 'error');
            if (errors.length === 0 && results.length > 0) {
                return `✅ Validation Passed: All ${results.length} files in '${path}' are syntactically correct.`;
            } else if (results.length === 0) {
                return `Error: No valid source files found in '${path}'.`;
            } else {
                return `❌ Validation Failed: Found ${errors.length} syntax errors in '${path}':\n` + 
                       errors.map(e => `- ${e.file}: ${e.message}`).join('\n');
            }
        } catch (e: any) {
            return `Failed to validate code: ${e.message}`;
        }
    },

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

            // 8. src/App.jsx (Minimal Entry Point to avoid large JSON payload)
            const appJsx = `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold mb-2">${title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
          Successfully scaffolded. Use tools to add more features.
        </p>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Count is {count}
        </button>
      </div>
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
                    "lucide-react": "^0.344.0",
                    "clsx": "^2.1.0",
                    "tailwind-merge": "^2.2.1"
                },
                devDependencies: {
                    "vite": "^5.1.4",
                    "@vitejs/plugin-react": "^4.2.1",
                    "tailwindcss": "^3.4.1",
                    "postcss": "^8.4.35",
                    "autoprefixer": "^10.4.18"
                },
                cocount: {
                    type: "web-container",
                    icon: (icon || '').trim().toLowerCase().startsWith('lucide:') ? icon : "./icon.svg",
                    window: { title, width: 1000, height: 800 }
                }
            };
            await System.fs.writeFile(`${appPath}/package.json`, JSON.stringify(pkgJson, null, 2));

            // Force wait for VFS state to fully propagate and trigger WebContainer Sync
            await new Promise(r => setTimeout(r, 1000));

            return `App "${title}" created successfully. Click the icon on your desktop or in File Explorer to launch it.`;
        } catch (e: any) {
            return `Failed to scaffold React app: ${e.message}`;
        }
    },

    scaffold_vue_app: async (args: { name: string, title: string, icon: string }) => {
        const { name, title, icon } = args;
        const appPath = `${SYSTEM_PATHS.USER}/apps/${name}`;

        try {
            await System.fs.createDirectory(appPath);
            await System.fs.createDirectory(`${appPath}/src`);
            await System.fs.createDirectory(`${appPath}/public`);
            await System.fs.createDirectory(`${appPath}/src/components`);

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

            const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
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

            const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}`;
            await System.fs.writeFile(`${appPath}/tailwind.config.js`, tailwindConfig);

            const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
            await System.fs.writeFile(`${appPath}/postcss.config.js`, postcssConfig);

            const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body class="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`;
            await System.fs.writeFile(`${appPath}/index.html`, indexHtml);

            const mainJs = `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')`;
            await System.fs.writeFile(`${appPath}/src/main.js`, mainJs);

            const styleCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
            await System.fs.writeFile(`${appPath}/src/style.css`, styleCss);

            const appVue = `<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 text-center p-10">
      <div class="text-5xl mb-6 inline-block animate-bounce">${(icon || '').trim().toLowerCase().startsWith('lucide:') ? '✨' : icon || '✨'}</div>
      <h1 class="text-3xl font-bold mb-4">${title}</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8">
        Vue 3 + Vite + Tailwind CSS App.
      </p>
      <button 
        @click="count++" 
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
      >
        Clicked: {{ count }}
      </button>
    </div>
  </div>
</template>`;
            await System.fs.writeFile(`${appPath}/src/App.vue`, appVue);

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
                    "vue": "^3.4.21"
                },
                devDependencies: {
                    "vite": "^5.1.4",
                    "@vitejs/plugin-vue": "^5.0.4",
                    "tailwindcss": "^3.4.1",
                    "postcss": "^8.4.35",
                    "autoprefixer": "^10.4.18"
                },
                cocount: {
                    type: "web-container",
                    icon: (icon || '').trim().toLowerCase().startsWith('lucide:') ? icon : "./icon.svg",
                    window: { title, width: 1000, height: 800 }
                }
            };
            await System.fs.writeFile(`${appPath}/package.json`, JSON.stringify(pkgJson, null, 2));
            await new Promise(r => setTimeout(r, 1000));
            return `Vue App "${title}" created successfully.`;
        } catch (e: any) {
            return `Failed to scaffold Vue app: ${e.message}`;
        }
    },

    scaffold_fullstack_app: async (args: { name: string, title: string, icon: string }) => {
        const { name, title, icon } = args;
        const appPath = `${SYSTEM_PATHS.USER}/apps/${name}`;

        try {
            await System.fs.createDirectory(appPath);
            await System.fs.createDirectory(`${appPath}/frontend`);
            await System.fs.createDirectory(`${appPath}/frontend/src`);
            await System.fs.createDirectory(`${appPath}/frontend/public`);
            await System.fs.createDirectory(`${appPath}/backend`);

            await System.fs.writeFile(`${appPath}/icon.svg`, generateIconSvg(name, title, icon));

            const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
})`;
            await System.fs.writeFile(`${appPath}/frontend/vite.config.js`, viteConfig);

            const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}`;
            await System.fs.writeFile(`${appPath}/frontend/tailwind.config.js`, tailwindConfig);

            const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
            await System.fs.writeFile(`${appPath}/frontend/postcss.config.js`, postcssConfig);

            const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body class="bg-gray-50 text-gray-900">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
            await System.fs.writeFile(`${appPath}/frontend/index.html`, indexHtml);

            const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
            await System.fs.writeFile(`${appPath}/frontend/src/index.css`, indexCss);

            const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
            await System.fs.writeFile(`${appPath}/frontend/src/main.jsx`, mainJsx);

            const appJsx = `import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Database, Server, Cpu } from 'lucide-react'

function App() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState({ backend: 'checking', db: 'checking' })

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos()
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus({ backend: 'online', db: data.db })
    } catch (err) {
      setStatus({ backend: 'offline', db: 'offline' })
      setError('Cannot connect to backend server on port 3001.')
    }
  }

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTodos(data)
      setError(null)
    } catch (err) {
      setError('Failed to load todos.')
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newTodo = { title: inputValue, completed: 0 }
    setInputValue('')
    
    // Optimistic UI update
    const tempId = Date.now()
    setTodos([...todos, { ...newTodo, id: tempId }])

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      })
      if (!res.ok) throw new Error('Failed to add')
      fetchTodos() // Refresh to get real ID
    } catch (err) {
      setError('Failed to add todo.')
      setTodos(todos.filter(t => t.id !== tempId)) // Revert
    }
  }

  const toggleTodo = async (id, currentStatus) => {
    // Optimistic UI update
    setTodos(todos.map(t => t.id === id ? { ...t, completed: currentStatus ? 0 : 1 } : t))
    
    try {
      await fetch(\`/api/todos/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: currentStatus ? 0 : 1 })
      })
    } catch (err) {
      setError('Failed to update.')
      fetchTodos() // Revert
    }
  }

  const deleteTodo = async (id) => {
    // Optimistic UI update
    const previousTodos = [...todos]
    setTodos(todos.filter(t => t.id !== id))
    
    try {
      await fetch(\`/api/todos/\${id}\`, { method: 'DELETE' })
    } catch (err) {
      setError('Failed to delete.')
      setTodos(previousTodos) // Revert
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">${title}</h1>
          <p className="text-gray-500">React Frontend + Express Backend + SQLite WASM</p>
        </div>

        {/* System Status Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap gap-6 items-center justify-center text-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Frontend:</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">Vite (Port 5173)</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className={\`w-5 h-5 \${status.backend === 'online' ? 'text-green-500' : 'text-red-500'}\`} />
            <span className="font-medium">Backend:</span>
            <span className={\`px-2 py-1 rounded-md \${status.backend === 'online' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}\`}>
              {status.backend === 'online' ? 'Express (Port 3001)' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Database className={\`w-5 h-5 \${status.db === 'connected' ? 'text-purple-500' : 'text-gray-400'}\`} />
            <span className="font-medium">Database:</span>
            <span className={\`px-2 py-1 rounded-md \${status.db === 'connected' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'}\`}>
              {status.db === 'connected' ? 'SQLite (Memory + VFS)' : 'Waiting...'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Todo App Core */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Input Form */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <form onSubmit={addTodo} className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                disabled={status.backend !== 'online'}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || status.backend !== 'online'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </form>
          </div>

          {/* Todo List */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading data from database...</div>
            ) : todos.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <Database className="w-12 h-12 mb-3 opacity-20" />
                <p>No tasks found in the database. Add one above!</p>
              </div>
            ) : (
              todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group">
                  <button 
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={\`flex-shrink-0 transition-colors \${todo.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}\`}
                  >
                    {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <span className={\`flex-1 text-lg transition-all \${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}\`}>
                    {todo.title}
                  </span>
                  
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 p-2 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
export default App`;
            await System.fs.writeFile(`${appPath}/frontend/src/App.jsx`, appJsx);

            const pkgJsonFrontend = {
                name: "frontend",
                private: true,
                type: "module",
                scripts: { "dev": "vite", "build": "vite build" },
                dependencies: {
                    "react": "^18.3.1",
                    "react-dom": "^18.3.1",
                    "lucide-react": "^0.344.0"
                },
                devDependencies: {
                    "vite": "^5.1.4",
                    "@vitejs/plugin-react": "^4.2.1",
                    "tailwindcss": "^3.4.1",
                    "postcss": "^8.4.35",
                    "autoprefixer": "^10.4.18"
                }
            };
            await System.fs.writeFile(`${appPath}/frontend/package.json`, JSON.stringify(pkgJsonFrontend, null, 2));

            const serverJs = `import express from 'express';
import { initDb, getDb, saveDb } from './db.js';

const app = express();
app.use(express.json());

// System Status Check
app.get('/api/status', async (req, res) => {
    try {
        const db = await getDb();
        res.json({ backend: 'online', db: 'connected' });
    } catch (e) {
        res.status(500).json({ backend: 'online', db: 'error', error: e.message });
    }
});

// GET all todos
app.get('/api/todos', async (req, res) => {
    try {
        const db = await getDb();
        const results = db.exec("SELECT * FROM todos ORDER BY id DESC");
        const todos = results.length > 0 
          ? results[0].values.map(row => Object.fromEntries(row.map((val, i) => [results[0].columns[i], val])))
          : [];
        res.json(todos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST a new todo
app.post('/api/todos', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });
        
        const db = await getDb();
        const id = Date.now();
        db.run("INSERT INTO todos (id, title, completed) VALUES (?, ?, ?)", [id, title, 0]);
        saveDb();
        
        res.status(201).json({ id, title, completed: 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT (update) a todo
app.put('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;
        
        const db = await getDb();
        db.run("UPDATE todos SET completed = ? WHERE id = ?", [completed, Number(id)]);
        saveDb();
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE a todo
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = await getDb();
        db.run("DELETE FROM todos WHERE id = ?", [Number(id)]);
        saveDb();
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3001;

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(\`Backend running on port \${PORT}\`);
    });
}).catch(console.error);`;
            await System.fs.writeFile(`${appPath}/backend/server.js`, serverJs);

            const dbJs = `import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const DB_PATH = path.join(process.cwd(), 'data.sqlite');
let dbInstance = null;

export async function initDb() {
    const SQL = await initSqlJs({});

    if (fs.existsSync(DB_PATH)) {
        const filebuffer = fs.readFileSync(DB_PATH);
        dbInstance = new SQL.Database(filebuffer);
        console.log('Loaded existing DB.');
    } else {
        dbInstance = new SQL.Database();
        console.log('Created new DB.');
    }
    
    // Always ensure the table exists (in case a blank db was loaded or just created)
    dbInstance.run("CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, title TEXT, completed INTEGER);");
    saveDb();
    
    return dbInstance;
}

export async function getDb() {
    if (!dbInstance) await initDb();
    return dbInstance;
}

export function saveDb() {
    if (!dbInstance) return;
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}`;
            await System.fs.writeFile(`${appPath}/backend/db.js`, dbJs);

            const pkgJsonBackend = {
                name: "backend",
                private: true,
                type: "module",
                scripts: { "dev": "node server.js" },
                dependencies: {
                    "express": "^4.19.2",
                    "sql.js": "^1.10.2"
                }
            };
            await System.fs.writeFile(`${appPath}/backend/package.json`, JSON.stringify(pkgJsonBackend, null, 2));

            const rootPkgJson = {
                name: name,
                version: "1.0.0",
                private: true,
                scripts: {
                    "postinstall": "npm install --prefix frontend && npm install --prefix backend",
                    "install:all": "npm install",
                    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\""
                },
                devDependencies: {
                    "concurrently": "^8.2.2"
                },
                cocount: {
                    type: "web-container",
                    icon: (icon || '').trim().toLowerCase().startsWith('lucide:') ? icon : "./icon.svg",
                    window: { title, width: 1000, height: 800 }
                }
            };
            await System.fs.writeFile(`${appPath}/package.json`, JSON.stringify(rootPkgJson, null, 2));

            await new Promise(r => setTimeout(r, 1000));
            return `Fullstack App "${title}" created successfully. IMPORTANT: You must run 'npm run install:all' before starting the app. The app consists of a React frontend (Vite) and an Express backend (with sql.js WASM SQLite).`;
        } catch (e: any) {
            return `Failed to scaffold Fullstack app: ${e.message}`;
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
            const path = normalizePath(args.path);
            if (!path) return "Error: Path is required";
            await System.fs.createDirectory(path);
            return `Directory created at '${path}'`;
        } catch (e: any) {
            return `Error creating directory: ${e.message || e}`;
        }
    },

    create_file: async (args: { path: string, content: string }) => {
        try {
            const path = normalizePath(args.path);
            if (!path) return "Error: Path is required";
            
            if (path.endsWith('package.json')) {
                try {
                    JSON.parse(args.content || '');
                } catch (e: any) {
                    return `Error creating file: package.json must be valid JSON (${e.message || e})`;
                }
            }
            await System.fs.writeFile(path, args.content || '');
            return `File created at '${path}'`;
        } catch (e: any) {
            return `Error creating file: ${e.message || e}`;
        }
    },

    list_directory: async (args: { path: string }) => {
        try {
            const path = normalizePath(args.path);
            const entries = System.fs.readDir(path);
            const results = await Promise.all(entries.map(async (e) => {
                let size = 0;
                if (e.type === 'file') {
                    try {
                        const content = await System.fs.readFile(`${path}/${e.name}`);
                        size = content.length;
                    } catch {}
                }
                return {
                    name: e.name,
                    type: e.type,
                    size: size > 0 ? `${(size / 1024).toFixed(1)} KB` : undefined
                };
            }));
            return JSON.stringify(results);
        } catch (e) {
            return `Error listing directory: ${e}`;
        }
    },

    read_file: async (args: { path: string; start_line?: number; end_line?: number }) => {
        try {
            const path = normalizePath(args.path);
            const content = await System.fs.readFile(path);
            if (args.start_line !== undefined || args.end_line !== undefined) {
                const lines = content.split('\n');
                const start = (args.start_line || 1) - 1;
                const end = args.end_line || lines.length;
                const sliced = lines.slice(start, end);
                const totalLines = lines.length;
                return `[File: ${path}, Lines ${start + 1}-${Math.min(end, totalLines)} of ${totalLines}]\n${sliced.join('\n')}`;
            }
            return content;
        } catch (e: any) {
            return `Error reading file: ${e.message || e}`;
        }
    },

    update_file: async (args: { path: string; content: string }) => {
        try {
            const path = normalizePath(args.path);
            if (path?.endsWith('package.json')) {
                try {
                    JSON.parse(args.content || '');
                } catch (e: any) {
                    return `Error updating file: package.json must be valid JSON (${e.message || e})`;
                }
            }
            await System.fs.writeFile(path, args.content);
            return `File updated at '${path}'`;
        } catch (e: any) {
            return `Error updating file: ${e.message || e}`;
        }
    },

    replace_in_file: async (args: { path: string; find: string; replace: string; expectedCount?: number; regex?: boolean; flags?: string; replaceAll?: boolean }) => {
        try {
            const path = normalizePath(args.path);
            const original = await System.fs.readFile(path);
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

            await System.fs.writeFile(path, next);
            return `Replaced ${count} occurrence(s) in '${path}'.`;
        } catch (e: any) {
            return `Error replacing in file: ${e.message || e}`;
        }
    },

    // --- AST Modification ---
    insert_jsx_component: async (args: { path: string, componentName: string, targetElement?: string, position: 'prepend' | 'append' | 'before' | 'after', jsxCode: string }) => {
        try {
            const path = normalizePath(args.path);
            const code = await System.fs.readFile(path);
            const newCode = AstTools.insertJsx(
                code, 
                args.componentName, 
                args.targetElement || null, 
                args.position, 
                args.jsxCode
            );
            await System.fs.writeFile(path, newCode);
            return `Successfully inserted JSX into '${args.componentName}' in ${path}`;
        } catch (e: any) {
            return `Error inserting JSX: ${e.message}`;
        }
    },

    add_import: async (args: { path: string, importCode: string }) => {
        try {
            const path = normalizePath(args.path);
            const code = await System.fs.readFile(path);
            const newCode = AstTools.addImport(code, args.importCode);
            if (code === newCode) {
                return `Import already exists or no changes made in ${path}`;
            }
            await System.fs.writeFile(path, newCode);
            return `Successfully added import to ${path}`;
        } catch (e: any) {
            return `Error adding import: ${e.message}`;
        }
    },

    delete_node: async (args: { path: string }) => {
        try {
            const path = normalizePath(args.path);
            const store = useFileSystemStore.getState();
            const node = store.getNodeByPath(path);
            if (!node) return `Error: Node not found at '${path}'`;
            
            store.deleteItem(node.id);
            return `Successfully deleted '${path}'`;
        } catch (e: any) {
            return `Error deleting node: ${e.message || e}`;
        }
    },

    move_node: async (args: { oldPath: string, newPath: string }) => {
        try {
            const oldPath = normalizePath(args.oldPath);
            const newPath = normalizePath(args.newPath);
            const store = useFileSystemStore.getState();
            const node = store.getNodeByPath(oldPath);
            if (!node) return `Error: Node not found at '${oldPath}'`;

            const parts = newPath.split('/').filter(Boolean);
            const newName = parts.pop();
            const parentPath = '/' + parts.join('/');
            
            if (!newName) return `Error: Invalid newPath '${newPath}'`;

            const parentNode = store.getNodeByPath(parentPath);
            if (!parentNode || parentNode.type !== 'folder') return `Error: Target parent directory '${parentPath}' not found.`;

            store.moveItem(node.id, parentNode.id, newName);
            return `Successfully moved/renamed '${oldPath}' to '${newPath}'`;
        } catch (e: any) {
            return `Error moving node: ${e.message || e}`;
        }
    },

    // --- Execution ---
    run_command: async (args: { cmd: string, args?: string[], cwd?: string, detached?: boolean, successPattern?: string }, ctx?: ToolContext) => {
        // STRICT RESTRICTION: No destructive or long-running commands in Builder mode via Shell.
        const forbiddenCommands = ['rm', 'mkdir', 'mv', 'cp', 'touch', 'npm', 'yarn', 'pnpm', 'npx'];
        if (forbiddenCommands.includes(args.cmd.toLowerCase())) {
            return `Refused: Command '${args.cmd}' is forbidden for safety and persistence. Use the provided VFS tools (create_file, delete_node, move_node, etc.) instead. AI should NEVER use shell to modify files.`;
        }

        const cwd = normalizePath(args.cwd || '/');
        let output = '';
        try {
            const store = useWebContainerStore.getState();
            if (!store.instance) {
                await store.boot();
                if (!store.instance) return `Failed to initialize WebContainer.`;
            }

            let lastPromptOutputLength = 0;
            const dispatchOutput = (data: string) => {
                const cleanData = data.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
                output += cleanData;
                window.dispatchEvent(new CustomEvent('ai-builder:command-output', {
                    detail: { cmd: args.cmd, output: cleanData }
                }));
                if (output.length - lastPromptOutputLength < 10) return;
            };

            const timeoutMs = 60000;
            const timeoutPromise = new Promise<number>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds. Shell commands should be short diagnostic tasks only.`));
                }, timeoutMs);
            });

            const exitCode = await Promise.race([
                store.runCommand(args.cmd, args.args || [], cwd, dispatchOutput, { detached: args.detached, successPattern: args.successPattern }),
                timeoutPromise
            ]);

            if (exitCode === 0) {
                const limit = 2000;
                let finalOutput = output;
                if (output.length > limit) {
                    finalOutput = output.slice(0, 500) + '\n...[truncated]...\n' + output.slice(-(limit - 500));
                }
                return `Command executed successfully.\nOutput:\n${finalOutput}`;
            } else {
                return `Command failed with exit code ${exitCode}.\nOutput:\n${output.slice(-2000)}`;
            }
        } catch (e: any) {
            return `Error running command: ${e.message || e}`;
        }
    },

    get_file_tree: async (args: { path: string, depth?: number, exclude?: string[] }) => {
        const rootPath = normalizePath(args.path);
        const { depth = 2, exclude = ['node_modules', '.next', '.git', 'dist', 'build'] } = args;
        
        const scan = async (dir: string, currentDepth: number): Promise<any[]> => {
            if (currentDepth > depth) return [];
            try {
                const entries = System.fs.readDir(dir);
                const results: any[] = [];
                
                for (const entry of entries) {
                    if (exclude.some(pattern => entry.name.includes(pattern))) continue;
                    
                    const fullPath = `${dir}/${entry.name}`;
                    if (entry.type === 'directory') {
                        results.push({
                            name: entry.name,
                            type: 'directory',
                            children: await scan(fullPath, currentDepth + 1)
                        });
                    } else {
                        results.push({
                            name: entry.name,
                            type: 'file'
                        });
                    }
                }
                return results;
            } catch (e) {
                return [];
            }
        };

        try {
            const tree = await scan(rootPath, 1);
            return JSON.stringify(tree);
        } catch (e) {
            return `Error getting file tree: ${e}`;
        }
    },

    search_code: async (args: { query: string, path: string, extensions?: string[], exclude?: string[] }) => {
        const rootPath = normalizePath(args.path);
        const { query, extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html'], exclude = ['node_modules', '.next', '.git'] } = args;
        const results: { file: string, line: number, content: string }[] = [];

        const scan = async (dir: string) => {
            try {
                const entries = System.fs.readDir(dir);
                for (const entry of entries) {
                    if (exclude.some(pattern => entry.name.includes(pattern))) continue;
                    
                    const fullPath = `${dir}/${entry.name}`;
                    if (entry.type === 'directory') {
                        await scan(fullPath);
                    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                        try {
                            const content = await System.fs.readFile(fullPath);
                            const lines = content.split('\n');
                            lines.forEach((line, index) => {
                                if (line.includes(query)) {
                                    results.push({
                                        file: fullPath,
                                        line: index + 1,
                                        content: line.trim().slice(0, 200)
                                    });
                                }
                            });
                        } catch {}
                    }
                    if (results.length > 50) break; // Limit results
                }
            } catch {}
        };

        try {
            await scan(rootPath);
            if (results.length === 0) return `No matches found for "${query}" in ${rootPath}`;
            return JSON.stringify(results);
        } catch (e) {
            return `Error searching code: ${e}`;
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
    {
        type: 'function',
        function: {
            name: 'scaffold_vue_app',
            description: 'Create a Vue 3 + Vite + Tailwind CSS app. Use this when the user specifically requests Vue.js.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'App folder name (e.g., "vue-app"). lowercase, no spaces.'
                    },
                    title: {
                        type: 'string',
                        description: 'App window title'
                    },
                    icon: {
                        type: 'string',
                        description: 'Emoji icon for the app'
                    }
                },
                required: ['name', 'title', 'icon']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'scaffold_fullstack_app',
            description: 'Create a Fullstack React + Express + WASM SQLite app. Generates frontend/ and backend/ with concurrently script. This is the SAFEST way to build an app with a backend database.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'App folder name (e.g., "fullstack-app"). lowercase, no spaces.'
                    },
                    title: {
                        type: 'string',
                        description: 'App window title'
                    },
                    icon: {
                        type: 'string',
                        description: 'Emoji icon for the app'
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
            description: 'Read file content. Use start_line/end_line for large files.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path' },
                    start_line: { type: 'number', description: 'Start line (1-based)' },
                    end_line: { type: 'number', description: 'End line' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_file',
            description: 'Overwrite an existing file with new content.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path' },
                    content: { type: 'string', description: 'New content' }
                },
                required: ['path', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_import',
            description: 'Add an import statement to a file.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    importCode: { type: 'string', description: 'e.g. "import { x } from \'y\';"' }
                },
                required: ['path', 'importCode']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'insert_jsx_component',
            description: 'Insert JSX into a React component using AST.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    componentName: { type: 'string' },
                    targetElement: { type: 'string', description: 'Optional target element' },
                    position: { type: 'string', enum: ['prepend', 'append', 'before', 'after'] },
                    jsxCode: { type: 'string' }
                },
                required: ['path', 'componentName', 'position', 'jsxCode']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'replace_in_file',
            description: 'Replace text in a file without rewriting everything.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    find: { type: 'string' },
                    replace: { type: 'string' },
                    regex: { type: 'boolean' },
                    replaceAll: { type: 'boolean' }
                },
                required: ['path', 'find', 'replace']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_node',
            description: 'Permanently delete a file or directory.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'move_node',
            description: 'Move or rename a file or directory.',
            parameters: {
                type: 'object',
                properties: {
                    oldPath: { type: 'string' },
                    newPath: { type: 'string' }
                },
                required: ['oldPath', 'newPath']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run read-only diagnostic commands (e.g. ls, grep, cat).',
            parameters: {
                type: 'object',
                properties: {
                    cmd: { type: 'string' },
                    args: { type: 'array', items: { type: 'string' } },
                    cwd: { type: 'string' }
                },
                required: ['cmd']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'validate_app_code',
            description: 'Check JS/TS files for syntax errors.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_file_tree',
            description: 'Get a recursive list of files in a directory.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    depth: { type: 'number' },
                    exclude: { type: 'array', items: { type: 'string' } }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_code',
            description: 'Global code search (grep-like).',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    path: { type: 'string' },
                    extensions: { type: 'array', items: { type: 'string' } }
                },
                required: ['query', 'path']
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
        'delete_node',
        'move_node',
        'read_file',
        'update_file',
        'replace_in_file',
        'run_command',
        'get_file_tree',
        'search_code'
    ],
    builder: [
        'scaffold_static_app',
        'scaffold_react_app',
        'scaffold_vue_app',
        'scaffold_fullstack_app',
        'validate_app_code',
        'create_directory',
        'create_file',
        'delete_node',
        'move_node',
        'read_file',
        'update_file',
        'add_import',
        'insert_jsx_component',
        'replace_in_file',
        'run_command',
        'get_file_tree',
        'list_directory',
        'search_code'
    ]
};
