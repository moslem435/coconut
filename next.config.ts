import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Disable all development overlays
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // CSP and Security headers are now handled in middleware.ts
  // to allow dynamic configuration (e.g. domain whitelist)
};

export default nextConfig;
