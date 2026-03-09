import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';

interface BrowserProps {
  url?: string;
  initialUrl?: string; // Support both prop names
}

const BrowserApp = ({ url, initialUrl }: BrowserProps) => {
  // Use initialUrl if provided, otherwise fall back to url, then default
  const startUrl = initialUrl || url || 'https://google.com';

  // Debug logging
  React.useEffect(() => {
    console.log('[Browser] Props received:', { url, initialUrl, startUrl });
  }, [url, initialUrl, startUrl]);

  const [urlInput, setUrlInput] = useState(startUrl);
  const [iframeUrl, setIframeUrl] = useState(startUrl);
  const [iframeError, setIframeError] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Update URL when props change (e.g., when server-ready event fires)
  React.useEffect(() => {
    const newUrl = initialUrl || url;
    if (newUrl && newUrl !== iframeUrl) {
      console.log('[Browser] Updating URL from props:', newUrl);
      setUrlInput(newUrl);
      setIframeUrl(newUrl);
      setIframeError(null);
    }
  }, [initialUrl, url]);

  // Monitor iframe load errors
  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[Browser] Iframe loaded successfully:', iframeUrl);
      setIframeError(null);
    };

    const handleError = (e: ErrorEvent) => {
      console.error('[Browser] Iframe load error:', e);
      setIframeError('Failed to load content');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError as any);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError as any);
    };
  }, [iframeUrl]);

  // Check if this is a WebContainer URL
  const isWebContainerUrl = iframeUrl.includes('localhost') ||
    iframeUrl.includes('webcontainer') ||
    iframeUrl.includes('127.0.0.1') ||
    iframeUrl.includes('.local-corp.webcontainer.api.io') ||
    iframeUrl.includes('.local-corp.webcontainer-api.io');

  const handleNavigate = () => {
    let target = urlInput;
    if (!target.startsWith('http')) {
      target = `https://${target}`;
    }
    setIframeUrl(target);
    setUrlInput(target);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white pt-10">
      {/* Address Bar - positioned below title bar */}
      <div className="h-12 bg-white border-b flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => setIframeUrl(urlInput)}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          title="Reload"
        >
          <RotateCcw size={16} />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            className="w-full h-8 bg-gray-100 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            placeholder="Enter URL..."
          />
        </div>
        <button
          onClick={() => window.open(iframeUrl, '_blank')}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Content Area - flex-1 will take remaining space */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {/* Error Message */}
        {iframeError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50">
            <p className="text-sm font-medium">{iframeError}</p>
          </div>
        )}

        {/* Background Hint */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-0">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {isWebContainerUrl ? 'Development Server Ready' : 'Content Blocked?'}
          </h3>
          <p className="text-sm max-w-md mb-6">
            {isWebContainerUrl
              ? 'If the page is blank or shows an error, ensure your dev server (e.g. vite.config.ts) is configured with COOP/COEP headers.'
              : `If you see this, ${iframeUrl} might be blocking embeds or requires adding to the whitelist in Settings.`
            }
          </p>
        </div>

        {/* Iframe - absolute positioning to fill parent */}
        {isWebContainerUrl ? (
          // WebContainer URLs - minimal restrictions for cross-origin content
          <iframe
            ref={iframeRef}
            key={iframeUrl}
            src={iframeUrl}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            title="Browser"
            allow="cross-origin-isolated; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          // External URLs - with sandbox restrictions
          <iframe
            ref={iframeRef}
            key={iframeUrl}
            src={iframeUrl}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            title="Browser"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation allow-downloads allow-modals"
          />
        )}
      </div>
    </div>
  );
};

export default BrowserApp;
