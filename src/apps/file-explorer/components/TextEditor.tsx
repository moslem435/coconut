
import { useState, useEffect } from 'react'

interface TextEditorProps {
    initialContent?: string
    readOnly?: boolean
}

export default function TextEditor({ initialContent = '', readOnly = false }: TextEditorProps) {
    const [content, setContent] = useState(initialContent)

    return (
        <div className="h-full flex flex-col bg-white text-black font-mono">
            <textarea
                className="flex-1 w-full h-full p-4 resize-none outline-none text-sm"
                value={content}
                onChange={(e) => !readOnly && setContent(e.target.value)}
                readOnly={readOnly}
                spellCheck={false}
            />
            <div className="h-6 bg-gray-100 border-t border-gray-200 flex items-center px-2 text-xs text-gray-500">
                {content.length} characters
                <span className="ml-auto">{readOnly ? 'Read Only' : 'UTF-8'}</span>
            </div>
        </div>
    )
}
