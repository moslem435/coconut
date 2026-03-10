import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';

interface BrowserProps {
  url?: string;
  initialUrl?: string; // Support both prop names
  isAppMode?: boolean; // Hide address bar for app-like experience
  filePath?: string;   // Original file path for static app recovery
}

const BrowserApp = ({ url, initialUrl, isAppMode = false, filePath }: BrowserProps) => {
  // Use initialUrl if provided, otherwise fall back to url, then default
  const startUrl = initialUrl || url || 'https://google.com';

  // Debug logging
  React.useEffect(() => {
    console.log('[Browser] Props received:', { url, initialUrl, startUrl, filePath });
  }, [url, initialUrl, startUrl, filePath]);

  const [urlInput, setUrlInput] = useState(startUrl);
  const [iframeUrl, setIframeUrl] = useState(startUrl);
  const [iframeError, setIframeError] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Recovery logic for static apps (Blob URLs) after refresh
  React.useEffect(() => {
    const tryRecover = async () => {
      // Check if we need recovery:
      // 1. We are in app mode
      // 2. We have a source file path
      // 3. Current URL is a blob URL
      if (isAppMode && filePath && iframeUrl.startsWith('blob:')) {
        let isExpired = false;
        try {
          // Try to fetch HEAD to check validity
          const response = await fetch(iframeUrl, { method: 'HEAD' });
          if (!response.ok) isExpired = true;
        } catch (e) {
          // Network error usually means blob is gone
          isExpired = true;
        }

        if (isExpired) {
          console.log('[Browser] Blob URL expired, attempting recovery using filePath:', filePath);
          try {
            // Dynamically import to avoid circular dependency issues
            const { AppLauncherService } = await import('@/os/kernel/AppLauncherService');
            const newUrl = await AppLauncherService.getInstance().getStaticAppBlobUrl(filePath);
            if (newUrl) {
              console.log('[Browser] Recovered new Blob URL:', newUrl);
              setIframeUrl(newUrl);
              setUrlInput(newUrl);
              setIframeError(null);
            }
          } catch (err) {
            console.error('[Browser] Recovery failed:', err);
          }
        }
      }
    };

    tryRecover();
  }, []); // Run ONCE on mount only

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

      // Inject custom scrollbar styles into the iframe
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const style = doc.createElement('style');
          style.textContent = `
            /* Hide scrollbar completely but allow scrolling */
            ::-webkit-scrollbar {
              width: 0px;
              height: 0px;
              display: none;
            }
            /* Firefox */
            * {
              scrollbar-width: none;
            }
            /* Add padding to avoid TitleBar overlap in App Mode */
            body {
              padding-top: ${isAppMode ? '32px' : '0px'};
            }
          `;
          doc.head.appendChild(style);
        }
      } catch (e) {
        // Ignore cross-origin errors if any
        console.warn('[Browser] Could not inject styles:', e);
      }
    };

    const handleError = (e: ErrorEvent) => {
      console.error('[Browser] Iframe load error:', e);
      // Don't show generic error immediately for blob URLs, as they might be stale
      if (!iframeUrl.startsWith('blob:')) {
         setIframeError('Failed to load content');
      }
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
    <div className={`h-full w-full flex flex-col bg-transparent ${isAppMode ? '' : 'pt-10'}`}>
      {/* Address Bar - Only show in browser mode */}
      {!isAppMode && (
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
      )}

      {/* Content Area - flex-1 will take remaining space */}
      <div className="flex-1 relative overflow-hidden bg-transparent">
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
            className="absolute inset-0 w-full h-full border-0 bg-transparent"
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
            className="absolute inset-0 w-full h-full border-0 bg-transparent"
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
