import React from 'react';
import { AlertCircle } from 'lucide-react';

const YumeApp = () => {
  const url = "http://yume.noktt.cn";

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      
      {/* Content Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-white">
        {/* Background Hint (Visible if iframe fails or is loading transparently) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-0">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">无法加载内容？</h3>
          <p className="text-sm max-w-md mb-6">
            如果看到此页面，说明目标网站 <b>{url}</b> 可能禁止了嵌入 (X-Frame-Options/CSP)，或者存在网络问题。
          </p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            尝试在新窗口中访问 &rarr;
          </a>
        </div>

        {/* Iframe */}
        <iframe 
          id="yume-iframe"
          src={url}
          className="h-full w-full border-0 absolute inset-0 z-1 bg-white"
          title="Yume"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation allow-downloads"
        />
      </div>
    </div>
  );
};

export default YumeApp;
