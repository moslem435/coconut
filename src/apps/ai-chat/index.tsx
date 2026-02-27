import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { useChatStore } from './store/useChatStore';

export default function AIChatApp() {
    const { loadSessions } = useChatStore();

    useEffect(() => {
        loadSessions();
    }, []);

    return (
        <div className={`flex h-full w-full bg-[var(--os-bg-window)] text-[var(--os-text-primary)] overflow-hidden font-sans select-none`}>
            <div className="relative z-10 flex h-full w-full">
                <Sidebar />
                <main className="flex-1 relative min-w-0 flex flex-col">
                    <ChatArea />
                </main>
            </div>
        </div>
    );
}
