
/*
 * Global browser protection.
 * التفاصيل الحقيقية في console فقط.
 */
window.addEventListener("error", (event) => {
  console.error(
    "Unhandled browser error:",
    event.error || event.message,
  );
});

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      "Unhandled promise rejection:",
      event.reason,
    );

    event.preventDefault();
  },
);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
