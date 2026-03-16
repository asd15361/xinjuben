import { useEffect, useState } from 'react'
import { useStageStore } from '../../store/useStageStore'

interface StageContractSummaryState {
  outlineChecksum: string | null
  characterChecksum: string | null
  detailedOutlineChecksum: string | null
  scriptChecksum: string | null
}

export function useStageContractSummary(): StageContractSummaryState {
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)
  const [state, setState] = useState<StageContractSummaryState>({
    outlineChecksum: null,
    characterChecksum: null,
    detailedOutlineChecksum: null,
    scriptChecksum: null
  })

  useEffect(() => {
    let active = true

    async function syncContracts(): Promise<void> {
      const outlineContract = await window.api.workflow.buildOutlineStageContract(outline)
      const next: StageContractSummaryState = {
        outlineChecksum: outlineContract.fingerprint.checksum,
        characterChecksum: null,
        detailedOutlineChecksum: null,
        scriptChecksum: null
      }

      if (characters.length > 0) {
        const characterContract = await window.api.workflow.buildCharacterStageContract({
          outline,
          characters
        })
        next.characterChecksum = characterContract.fingerprint.checksum
      }

      if (characters.length > 0 && segments.length > 0) {
        const detailedOutlineContract = await window.api.workflow.buildDetailedOutlineStageContract({
          outline,
          characters,
          segments
        })
        next.detailedOutlineChecksum = detailedOutlineContract.fingerprint.checksum
      }

      if (characters.length > 0 && segments.length > 0 && script.length > 0) {
        const scriptContract = await window.api.workflow.buildScriptStageContract({
          outline,
          characters,
          segments,
          existingScript: script
        })
        next.scriptChecksum = scriptContract.fingerprint.checksum
      }

      if (active) {
        setState(next)
      }
    }

    void syncContracts()

    return () => {
      active = false
    }
  }, [characters, outline, script, segments])

  return state
}
