import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ExternalLink, Loader2 } from 'lucide-react';

interface BrowserProps {
  url?: string;
  initialUrl?: string; // Support both prop names
  isAppMode?: boolean; // Hide address bar for app-like experience
  filePath?: string;   // Original file path for static app recovery
  waitForServer?: boolean;
  launchStatus?: string;
  launchLabel?: string;
}

const BrowserApp = ({ 
  url, 
  initialUrl, 
  isAppMode = false, 
  filePath, 
  waitForServer = false,
  launchStatus = 'booting',
  launchLabel
}: BrowserProps) => {
  // Use initialUrl if provided, otherwise fall back to url, then default
  const startUrl = initialUrl || url || 'https://google.com';

  // Debug logging
  React.useEffect(() => {
    console.log('[Browser] Props received:', { url, initialUrl, startUrl, filePath });
  }, [url, initialUrl, startUrl, filePath]);

  const [urlInput, setUrlInput] = useState(startUrl);
  const [iframeUrl, setIframeUrl] = useState(startUrl);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [showAppOverlay, setShowAppOverlay] = useState(isAppMode && (waitForServer || !isIframeLoaded));
  const [lastUrlChangeAt, setLastUrlChangeAt] = useState<number>(() => Date.now());
  const [lastIframeLoadAt, setLastIframeLoadAt] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
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
      setIsIframeLoaded(false);
      setLastIframeLoadAt(null);
      setLastUrlChangeAt(Date.now());
      setLoadingProgress(0);
      setUrlInput(newUrl);
      setIframeUrl(newUrl);
      setIframeError(null);
    }
  }, [initialUrl, url]);

  React.useEffect(() => {
    if (!isAppMode || iframeError) {
      setLoadingProgress(0);
      return;
    }
    if (waitForServer || !isIframeLoaded) {
      const tick = window.setInterval(() => {
        setLoadingProgress((p) => {
          // Determine target cap based on status
          let cap = 95;
          let speed = 0.06;

          if (waitForServer) {
            if (launchStatus === 'booting') {
               cap = 25;
               speed = 0.1; 
            } else if (launchStatus === 'installing') {
               cap = 65;
               speed = 0.02; // Install is slow
            } else if (launchStatus === 'starting') {
               cap = 90;
               speed = 0.08;
            } else {
               cap = 92; // Default fallback
            }
          } else {
             // Server ready, waiting for iframe load
             cap = 98;
             speed = 0.15;
          }

          // If current progress is far behind target (e.g. status jump), accelerate
          if (cap - p > 15) speed = 0.2;

          const next = p + (cap - p) * speed + 0.1;
          return Math.min(cap, Math.max(p, next));
        });
      }, 120);
      return () => window.clearInterval(tick);
    }
    setLoadingProgress(100);
    return undefined;
  }, [isAppMode, waitForServer, isIframeLoaded, iframeError, iframeUrl, launchStatus]);

  React.useEffect(() => {
    if (!isAppMode || iframeError) {
      setShowAppOverlay(false);
      return;
    }
    if (waitForServer || !isIframeLoaded) {
      setShowAppOverlay(true);
      return;
    }
    const isWebContainerUrl =
      iframeUrl.includes('localhost') ||
      iframeUrl.includes('webcontainer') ||
      iframeUrl.includes('127.0.0.1') ||
      iframeUrl.includes('.local-corp.webcontainer.api.io') ||
      iframeUrl.includes('.local-corp.webcontainer-api.io');

    const holdMs = isWebContainerUrl ? 150 : 0;
    const anchor = lastIframeLoadAt ?? lastUrlChangeAt;
    const remaining = holdMs - (Date.now() - anchor);

    if (remaining > 0) {
      setShowAppOverlay(true);
      const t = window.setTimeout(() => setShowAppOverlay(false), remaining);
      return () => window.clearTimeout(t);
    }

    setShowAppOverlay(false);
    return undefined;
  }, [isAppMode, waitForServer, isIframeLoaded, iframeError, iframeUrl, lastUrlChangeAt, lastIframeLoadAt]);

  // Monitor iframe load errors
  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[Browser] Iframe loaded successfully:', iframeUrl);
      setIframeError(null);
      setIsIframeLoaded(true);
      setLastIframeLoadAt(Date.now());
      setLoadingProgress(100);

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
      setIsIframeLoaded(false);
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
    setIsIframeLoaded(false);
    setLastIframeLoadAt(null);
    setLastUrlChangeAt(Date.now());
    setLoadingProgress(0);
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

        {showAppOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-200 p-8 text-center z-50 bg-black/70 pointer-events-none transition-opacity duration-300">
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 size={28} className="text-gray-200 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              {launchLabel || (waitForServer ? '正在启动开发服务器' : '正在加载应用')}
            </h3>
            <p className="text-sm max-w-md opacity-80 min-h-[20px]">
              {/* Optional detail text, maybe just keep it simple or remove if label is detailed */}
              {(!launchLabel && waitForServer) ? '首次启动会自动安装依赖，完成后将自动打开页面' : ''}
            </p>
            <div className="w-80 max-w-[80vw] mt-6">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/60 transition-[width] duration-200"
                  style={{ width: `${Math.max(2, Math.min(100, loadingProgress))}%` }}
                />
              </div>
              <div className="mt-2 text-xs opacity-70 tabular-nums">
                {Math.round(Math.min(100, loadingProgress))}%
              </div>
            </div>
          </div>
        )}

        {!isAppMode && !waitForServer && !iframeError && !isIframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-0 pointer-events-none">
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
        )}

        {/* Iframe - absolute positioning to fill parent */}
        {isWebContainerUrl ? (
          // WebContainer URLs - minimal restrictions for cross-origin content
          <iframe
            ref={iframeRef}
            key={iframeUrl}
            src={iframeUrl}
            className="absolute inset-0 w-full h-full border-0 bg-black z-10"
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
            className="absolute inset-0 w-full h-full border-0 bg-black z-10"
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
