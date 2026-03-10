export const DEFAULT_CSP_CONFIG = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'", "blob:"],
    "style-src": ["'self'", "'unsafe-inline'", "https:", "http:"],
    "img-src": ["'self'", "blob:", "data:", "https:", "http:"],
    "font-src": ["'self'", "data:", "https:", "http:"],
    "frame-src": [
        "'self'",
        "blob:",
        "https://*.stackblitz.com",
        "https://stackblitz.com",
        "http://yume.noktt.cn",
        "http://localhost:*",
        "http://127.0.0.1:*",
        "https://*.local-corp.webcontainer.api.io",
        "https://*.local-corp.webcontainer-api.io",
        "https://*.webcontainer.io"
    ],
    "connect-src": ["'self'", "https:", "ws:", "wss:", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"]
};

export const CSP_COOKIE_NAME = 'x-csp-allowed-domains';
