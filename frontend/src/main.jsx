import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

console.log('[APP] main.jsx loaded');

// Global error handler - catches pre-render JS errors
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error || event.message);
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="min-height:100vh;background:#020617;color:#f1f5f9;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:20px"><div style="max-width:600px;background:#0f172a;border:1px solid #ef4444;border-radius:12px;padding:24px"><h2 style="color:#ef4444;margin:0 0 12px">Application Error</h2><pre style="color:#94a3b8;font-size:12px;white-space:pre-wrap;word-break:break-all">${event.error?.stack || event.message}</pre></div></div>`;
  }
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED REJECTION]', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[APP] Root element not found in index.html');
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('[APP] React root mounted');
  } catch (e) {
    console.error('[APP] React mount failed:', e);
    rootElement.innerHTML = `<div style="min-height:100vh;background:#020617;color:#f1f5f9;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:20px"><div style="max-width:600px;background:#0f172a;border:1px solid #ef4444;border-radius:12px;padding:24px"><h2 style="color:#ef4444;margin:0 0 12px">React Mount Error</h2><pre style="color:#94a3b8;font-size:12px;white-space:pre-wrap">${e.stack}</pre></div></div>`;
  }
}
