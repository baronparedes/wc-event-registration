import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

function getNodeModulePackageName(id: string) {
  const modulePath = id.split('node_modules/')[1]

  if (!modulePath) {
    return undefined
  }

  const [scopeOrName, maybeName] = modulePath.split('/')

  if (scopeOrName?.startsWith('@') && maybeName) {
    return `${scopeOrName}/${maybeName}`
  }

  return scopeOrName
}

function getVendorChunkName(id: string) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  const packageName = getNodeModulePackageName(id)

  if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
    return 'react-vendor'
  }

  if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
    return 'router-vendor'
  }

  if (id.includes('node_modules/@tanstack/react-query/')) {
    return 'query-vendor'
  }

  if (packageName?.startsWith('@supabase/')) {
    return `supabase-${packageName.split('/')[1]}`
  }

  if (
    id.includes('node_modules/lucide-react/') ||
    id.includes('node_modules/framer-motion/') ||
    id.includes('node_modules/sonner/')
  ) {
    return 'ui-vendor'
  }

  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
