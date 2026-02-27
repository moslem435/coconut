import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { useChatStore } from './store/useChatStore';
import { useWindowState } from '@/os/sdk';

export default function AIChatApp() {
    const { loadSessions } = useChatStore();
    const windowState = useWindowState('ai-chat');
    const isSidebar = windowState?.isSidebar;

    useEffect(() => {
        loadSessions();
    }, []);

    return (
        <div className={`flex h-full w-full bg-[var(--os-bg-window)] text-[var(--os-text-primary)] overflow-hidden font-sans select-none ${!isSidebar ? 'pt-10' : ''}`}>
            <div className="relative z-10 flex h-full w-full">
                <Sidebar />
                <main className="flex-1 relative min-w-0 flex flex-col">
                    <ChatArea />
                </main>
            </div>
        </div>
    );
}
