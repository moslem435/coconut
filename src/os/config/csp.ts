export const DEFAULT_CSP_CONFIG = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'", "blob:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https:"],
    "font-src": ["'self'", "data:"],
    "frame-src": [
        "'self'",
        "blob:",
        "https://*.stackblitz.com",
        "https://stackblitz.com",
        "http://yume.noktt.cn"
    ],
    "connect-src": ["'self'", "https:", "ws:", "wss:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"]
};

export const CSP_COOKIE_NAME = 'x-csp-allowed-domains';
