import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Inter empaquetada en local (T07a): sin fuentes remotas (OWASP A08).
import '@fontsource-variable/inter';
import { App } from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('No se encontró el elemento #root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
