import { setupReady } from './setup';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens/design-tokens.css'
import './index.css'
import App from './App.tsx'

setupReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
