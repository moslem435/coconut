import { create } from 'zustand'
import { WebContainer } from '@webcontainer/api'

interface WebContainerState {
  instance: WebContainer | null
  isBooting: boolean
  error: string | null
  
  boot: () => Promise<void>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
}

let bootPromise: Promise<WebContainer> | null = null

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
  instance: null,
  isBooting: false,
  error: null,

  boot: async () => {
    const { instance, isBooting } = get()
    if (instance) return
    if (isBooting) return

    set({ isBooting: true, error: null })

    try {
      if (!bootPromise) {
        bootPromise = WebContainer.boot()
      }
      const webcontainer = await bootPromise
      
      // Mount a basic starter project
      await webcontainer.mount({
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: 'web-os-terminal',
              type: 'module',
              dependencies: {
                'express': 'latest',
                'nodemon': 'latest'
              },
              scripts: {
                'start': 'nodemon index.js'
              }
            }, null, 2)
          }
        },
        'index.js': {
          file: {
            contents: `import express from 'express';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello from WebContainer OS!');
});

app.listen(port, () => {
  console.log(\`App running at http://localhost:\${port}\`);
});`
          }
        },
        'welcome.txt': {
            file: {
                contents: 'Welcome to the Node.js Terminal!\nRun `npm install` and `npm start` to see the magic.'
            }
        }
      })

      set({ instance: webcontainer, isBooting: false })
    } catch (err) {
      console.error('Failed to boot WebContainer:', err)
      set({ 
        error: err instanceof Error ? err.message : 'Failed to boot WebContainer', 
        isBooting: false 
      })
      bootPromise = null // Reset on failure
    }
  },

  writeFile: async (path: string, content: string) => {
    const { instance } = get()
    if (!instance) throw new Error('WebContainer not booted')
    await instance.fs.writeFile(path, content)
  },

  readFile: async (path: string) => {
    const { instance } = get()
    if (!instance) throw new Error('WebContainer not booted')
    const uint8 = await instance.fs.readFile(path)
    return new TextDecoder().decode(uint8)
  }
}))
