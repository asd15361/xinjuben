import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {
  installDynamicImportRecoveryLifecycle,
  reloadCurrentRendererResources
} from './app/utils/dynamic-import-recovery'

console.log('[renderer] main.tsx start')

installDynamicImportRecoveryLifecycle({
  window,
  storage: window.sessionStorage,
  reload: () => reloadCurrentRendererResources()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
