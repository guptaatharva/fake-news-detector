import type { NextConfig } from "next";

// Security headers (§2.7): the app previously shipped with none configured.
// CSP is intentionally permissive on 'unsafe-inline'/'unsafe-eval' for scripts
// because Next.js's dev/HMR runtime and several UI libraries used here
// (framer-motion, jspdf) rely on inline script execution; tightening this
// further would require a nonce-based CSP wired through the App Router.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://integrate.api.nvidia.com https://gnews.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  // tesseract.js (screenshot OCR, src/lib/ocr.ts) spawns a Node worker by
  // requiring worker-script/node/index.js relative to its own package
  // directory at runtime. Left to Next's default webpack bundling, that
  // require path gets rewritten into the .next build output instead of
  // node_modules, so the worker file can't be found ("Cannot find module
  // '.next/worker-script/node/index.js'"). Marking the package external
  // keeps it a plain Node `require` against the real node_modules install,
  // where its own relative path resolution works correctly.
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
