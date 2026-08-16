/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';

import { inject } from '@vercel/analytics';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
  inject({
    scriptSrc: 'https://va.vercel-scripts.com/v1/script.js',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
