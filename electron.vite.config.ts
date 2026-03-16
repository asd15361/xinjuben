import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('src/renderer/src/features/home/ui/')) return 'home-ui'
            if (
              id.includes('src/renderer/src/components/DetailedOutlineStage') ||
              id.includes('src/renderer/src/components/DetailedOutlineStageHeader') ||
              id.includes('src/renderer/src/components/DetailedOutlineActsPanel')
            ) {
              return 'detailed-outline-ui'
            }
            if (
              id.includes('src/renderer/src/features/script/ui/ScriptSupportPanels') ||
              id.includes('src/renderer/src/features/script/ui/PolicyStatusPanel') ||
              id.includes('src/renderer/src/features/script/ui/ScriptLedgerPanel') ||
              id.includes('src/renderer/src/features/script/ui/ScriptAuditPanel') ||
              id.includes('src/renderer/src/features/script/ui/ScriptRepairPanel')
            ) {
              return 'script-support'
            }
            if (!id.includes('node_modules')) return
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react')) return 'react-vendor'
            return undefined
          }
        }
      }
    },
    plugins: [react()]
  }
})
