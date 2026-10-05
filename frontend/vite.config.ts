import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

function shareTargetDevPlugin() {
  return {
    name: 'share-target-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/share-target') && req.method === 'POST') {
          const contentType = req.headers['content-type'] || '';
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            let text = '';
            // Multipart field parser for text/title/url
            const textMatch = body.match(/name="text"[\r\n]+([\s\S]*?)[\r\n]+---/i);
            const urlMatch = body.match(/name="url"[\r\n]+([\s\S]*?)[\r\n]+---/i);
            const titleMatch = body.match(/name="title"[\r\n]+([\s\S]*?)[\r\n]+---/i);

            const parts = [
              textMatch ? textMatch[1].trim() : '',
              urlMatch ? urlMatch[1].trim() : '',
              titleMatch ? titleMatch[1].trim() : '',
            ].filter(Boolean);

            if (parts.length > 0) {
              text = parts.join(' ');
            } else if (!contentType.includes('multipart/form-data')) {
              try {
                const parsed = JSON.parse(body);
                text = parsed.text || parsed.url || '';
              } catch {
                text = body;
              }
            }

            res.writeHead(303, { Location: `/check?text=${encodeURIComponent(text)}` });
            res.end();
          });
          return;
        }
        next();
      });
    },
  };
}

function cspProductionPlugin() {
  return {
    name: 'csp-production-plugin',
    transformIndexHtml(html: string, ctx: any) {
      if (ctx.server) {
        return html; // Dev mode: no CSP to allow Vite HMR and inline styles
      }
      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self';">`;
      return html.replace('</head>', `  ${cspMeta}\n  </head>`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cspProductionPlugin(),
    shareTargetDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'model/lang-model.json', 'tesseract/*'],
      manifest: {
        name: 'FraPI Sentinel 2.0 - Privacy-Preserving UPI Safety',
        short_name: 'FraPI Sentinel',
        description: "Don't just scan the QR. Verify the intent.",
        theme_color: '#0b0f17',
        background_color: '#0b0f17',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'image',
                accept: ['image/*'],
              },
            ],
          },
        },
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,json,gz}'],
        runtimeCaching: [
          {
            urlPattern: /^\/tesseract\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^\/model\/.*\.json/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ml-models',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
} as any)
