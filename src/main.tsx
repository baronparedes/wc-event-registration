/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';

import { inject } from '@vercel/analytics';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import '@/components/ui/NotificationPromptToast';
import { env } from '@/config/env';

import App from './App.tsx';
import './index.css';

registerSW({ immediate: true });

if (env.isProd) {
  inject({
    scriptSrc: 'https://va.vercel-scripts.com/v1/script.js',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
