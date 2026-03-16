import { motion } from 'framer-motion'
import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow'

interface ScriptSceneListProps {
  script: ScriptSegmentDto[]
}

function collectMissingFields(scene: ScriptSegmentDto): string[] {
  const missing: string[] = []
  if (!scene.action?.trim()) missing.push('动作')
  if (!scene.dialogue?.trim()) missing.push('对白')
  if (!scene.emotion?.trim()) missing.push('情感')
  return missing
}

export function ScriptSceneList(props: ScriptSceneListProps) {
  if (props.script.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">当前已经写出 {props.script.length} 场</p>
      {props.script.map((scene) => {
        const missing = collectMissingFields(scene)

        return (
          <motion.div
            key={scene.sceneNo}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold text-white/50">第 {scene.sceneNo} 场</p>
              {missing.length > 0 ? (
                <span className="text-[10px] text-yellow-200/70">还没补齐：{missing.join(' / ')}</span>
              ) : (
                <span className="text-[10px] text-green-300/70">这一场已经成形</span>
              )}
            </div>
            <p className="text-xs text-white/30 truncate">{scene.action || scene.dialogue || '这一场还没有写出可预览的内容。'}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
