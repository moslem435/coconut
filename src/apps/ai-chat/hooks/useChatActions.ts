
import { useCallback } from 'react';
import { useWindow } from '@/os/sdk';
import { useWindowStore } from '@/os/kernel/useWindowStore';
import { useChatStore } from '../store/useChatStore';

export function useChatActions() {
    const { launch: launchApp, update: updateWindow } = useWindow();
    const { toggleSidebar } = useChatStore();

    const handleRunApp = useCallback(async (code: string, language: string) => {
        const supportedLangs = ['tsx', 'jsx', 'javascript', 'typescript', 'js', 'ts', 'html'];
        if (!supportedLangs.includes(language)) {
            return;
        }

        const timestamp = Date.now();

        try {
            launchApp(
                `code-runner-${timestamp}`,
                'AI App Preview',
                'code-runner',
                undefined,
                { code, language }
            );
        } catch (e) {
            console.error("Failed to run app:", e);
        }
    }, [launchApp]);

    const handleToggleSidebar = useCallback(() => {
        toggleSidebar();
        const windowState = useWindowStore.getState().windows['ai-chat'];
        if (windowState && !windowState.isMaximized && windowState.size) {
            updateWindow('ai-chat', {
                size: {
                    ...windowState.size,
                    width: windowState.size.width + 280
                }
            });
        }
    }, [toggleSidebar, updateWindow]);

    const handleDetach = useCallback(() => {
        const isSidebar = useWindowStore.getState().windows['ai-chat']?.isSidebar;
        if (!isSidebar) return;

        const width = 900;
        const height = 700;
        const x = (window.innerWidth - width) / 2;
        const y = (window.innerHeight - height) / 2;

        updateWindow('ai-chat', {
            isSidebar: false,
            position: { x, y },
            size: { width, height },
            isMaximized: false
        });
    }, [updateWindow]);

    return {
        handleRunApp,
        handleToggleSidebar,
        handleDetach
    };
}
