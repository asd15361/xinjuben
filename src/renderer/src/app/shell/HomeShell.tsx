import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { AppBackdrop } from './AppBackdrop'
import { AppHeader } from './AppHeader'
import { HomePage } from '../../features/home/ui/HomePage'

export function HomeShell(): JSX.Element {
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: '#050505', color: '#f8fafc' }}
    >
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AppBackdrop />
        <AppHeader />

        <div className="flex-1 p-3 lg:p-5 xl:p-8 overflow-hidden relative z-10">
          <div className="h-full">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="glass-panel rounded-[24px] p-4 lg:p-6 xl:p-8 h-full overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-6">
                <Zap className="fill-current text-orange-500" size={18} />
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-medium">
                  创作总览
                </p>
              </div>
              <HomePage />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
