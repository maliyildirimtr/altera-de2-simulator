import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens/design-tokens.css'
import './index.css'
import App from './App.tsx'

// jQuery/DigitalJS setup (src/setup.ts) is loaded by the Schematic viewport,
// the only place that needs it, so it no longer delays the first render.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
