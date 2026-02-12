import React from 'react'

interface Props {
    appId: string
    className?: string
}

export function SandboxedAppFrame({ appId, className }: Props) {
    return (
        <iframe 
            src={`/sandbox?appId=${appId}`} 
            className={className}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
        />
    )
}
