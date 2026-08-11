import react from '@vitejs/plugin-react';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

function getNodeModulePackageName(id: string) {
  const modulePath = id.split('node_modules/')[1];

  if (!modulePath) {
    return undefined;
  }

  const [scopeOrName, maybeName] = modulePath.split('/');

  if (scopeOrName?.startsWith('@') && maybeName) {
    return `${scopeOrName}/${maybeName}`;
  }

  return scopeOrName;
}

function getVendorChunkName(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const packageName = getNodeModulePackageName(id);

  if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
    return 'react-vendor';
  }

  if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
    return 'router-vendor';
  }

  if (id.includes('node_modules/@tanstack/react-query/')) {
    return 'query-vendor';
  }

  if (packageName?.startsWith('@supabase/')) {
    return `supabase-${packageName.split('/')[1]}`;
  }

  if (
    id.includes('node_modules/lucide-react/') ||
    id.includes('node_modules/framer-motion/') ||
    id.includes('node_modules/sonner/')
  ) {
    return 'ui-vendor';
  }

  return 'vendor';
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-csp-meta-for-production',
      apply: 'build',
      transformIndexHtml(html) {
        const csp =
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co;";

        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        );
      },
    },
  ],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    chunkSizeWarningLimit: 200,
    rolldownOptions: {
      output: {
        codeSplitting: true,
        manualChunks: getVendorChunkName,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
