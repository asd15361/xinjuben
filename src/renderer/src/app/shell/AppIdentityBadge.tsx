import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

interface AppIdentityBadgeProps {
  appName: string
}

export function AppIdentityBadge({ appName }: AppIdentityBadgeProps) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 cursor-pointer">
      <div className="text-right">
        <p className="text-[10px] font-black text-white">{appName}</p>
        <p className="text-[8px] text-white/30 font-bold tracking-widest uppercase">创作台</p>
      </div>
      <div className="w-10 h-10 rounded-xl p-[1px]" style={{ background: 'linear-gradient(135deg, #FF7A00, #f97316)' }}>
        <div className="w-full h-full rounded-[11px] bg-black flex items-center justify-center">
          <Users size={16} style={{ color: '#FF7A00' }} />
        </div>
      </div>
    </motion.div>
  )
}
