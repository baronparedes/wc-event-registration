import { StrictMode } from 'react';

import { inject } from '@vercel/analytics';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  inject({
    scriptSrc: 'https://va.vercel-scripts.com/v1/script.js',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
