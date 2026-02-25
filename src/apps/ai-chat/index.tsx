import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { useChatStore } from './store/useChatStore';
import { useWindowStore } from '@/os/kernel/useWindowStore';

export default function AIChatApp() {
    const { loadSessions } = useChatStore();
    const isSidebar = useWindowStore(state => state.windows['ai-chat']?.isSidebar);

    useEffect(() => {
        loadSessions();
    }, []);

    return (
        <div className={`flex h-full w-full bg-black/20 text-zinc-100 overflow-hidden font-sans select-none ${!isSidebar ? 'pt-10' : ''}`}>
            <div className="relative z-10 flex h-full w-full">
                <Sidebar />
                <main className="flex-1 relative min-w-0 flex flex-col">
                    <ChatArea />
                </main>
            </div>
        </div>
    );
}
