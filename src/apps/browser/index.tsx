import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';

interface BrowserProps {
    url?: string;
}

const BrowserApp = ({ url: initialUrl }: BrowserProps) => {
  const [url, setUrl] = useState(initialUrl || 'https://google.com');
  const [iframeUrl, setIframeUrl] = useState(initialUrl || 'https://google.com');

  const handleNavigate = () => {
    let target = url;
    if (!target.startsWith('http')) {
        target = `https://${target}`;
    }
    setIframeUrl(target);
    setUrl(target);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Address Bar */}
      <div className="h-10 bg-white border-b flex items-center px-2 gap-2 shrink-0">
        <button 
            onClick={() => setIframeUrl(url)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
        >
            <RotateCcw size={14} />
        </button>
        <div className="flex-1 relative">
            <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                className="w-full h-7 bg-gray-100 rounded px-3 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
            />
        </div>
        <button 
            onClick={() => window.open(iframeUrl, '_blank')}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
            title="Open in real browser"
        >
            <ExternalLink size={14} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-white">
        {/* Background Hint */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-0">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Content Blocked?</h3>
          <p className="text-sm max-w-md mb-6">
            If you see this, <b>{iframeUrl}</b> might be blocking embeds or requires adding to the whitelist in Settings.
          </p>
        </div>

        {/* Iframe */}
        <iframe 
          key={iframeUrl}
          src={iframeUrl}
          className="h-full w-full border-0 absolute inset-0 z-1 bg-white"
          title="Browser"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation allow-downloads"
        />
      </div>
    </div>
  );
};

export default BrowserApp;
