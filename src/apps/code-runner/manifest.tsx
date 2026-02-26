
import { AppManifest } from '@/os/registry/types';
import { Play } from 'lucide-react';
import dynamic from 'next/dynamic';

const CodeRunner = dynamic(() => import('./App'), { ssr: false });

export const manifest: AppManifest = {
    id: 'code-runner',
    title: 'Code Runner',
    icon: Play,
    component: CodeRunner,
    defaultWindowOptions: {
        width: 800,
        height: 600,
        isResizable: true,
        isMaximized: false
    },
    version: '1.0.0',
    description: 'Dynamic Code Execution Environment (React/Node/WASM)',
    category: 'utility'
};
