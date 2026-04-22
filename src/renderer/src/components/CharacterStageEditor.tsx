import { WorkspaceInput } from './WorkspaceCommons'

interface CharacterDraft {
  name: string
  biography: string
  publicMask: string
  hiddenPressure: string
  fear: string
  protectTarget: string
  conflictTrigger: string
  advantage: string
  weakness: string
  goal: string
  arc: string
}

interface CharacterStageEditorProps {
  characters: CharacterDraft[]
  draft: CharacterDraft
  editingIndex: number | null
  downstreamLocked: boolean
  onDraftChange: (next: CharacterDraft) => void
  onCharacterChange: (index: number, next: Partial<CharacterDraft>) => void
}

export function CharacterStageEditor(props: CharacterStageEditorProps): JSX.Element {
  const { characters, draft, editingIndex, downstreamLocked, onDraftChange, onCharacterChange } =
    props
  const currentCharacter = editingIndex !== null ? characters[editingIndex] : draft

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
        {editingIndex !== null ? `编辑人物 #${editingIndex + 1}` : '新建人物'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WorkspaceInput
          label="人物姓名"
          placeholder="例：陆以橙"
          value={currentCharacter.name}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { name: value })
              : onDraftChange({ ...draft, name: value })
          }
          disabled={downstreamLocked}
        />
        <WorkspaceInput
          label="主要目标"
          placeholder="例：拿回属于自己的一切"
          value={currentCharacter.goal}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { goal: value })
              : onDraftChange({ ...draft, goal: value })
          }
          disabled={downstreamLocked}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WorkspaceInput
          label="表面样子"
          placeholder="例：人人看他软弱、低调、没本事"
          value={currentCharacter.publicMask}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { publicMask: value })
              : onDraftChange({ ...draft, publicMask: value })
          }
          disabled={downstreamLocked}
        />
        <WorkspaceInput
          label="暗里卡着什么"
          placeholder="例：背着师父留下的秘密，一旦露底就会出人命"
          value={currentCharacter.hiddenPressure}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { hiddenPressure: value })
              : onDraftChange({ ...draft, hiddenPressure: value })
          }
          disabled={downstreamLocked}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WorkspaceInput
          label="最怕失去什么"
          placeholder="例：最怕小柔因为自己出事"
          value={currentCharacter.fear}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { fear: value })
              : onDraftChange({ ...draft, fear: value })
          }
          disabled={downstreamLocked}
        />
        <WorkspaceInput
          label="最想守住什么"
          placeholder="例：守住师父留下的钥匙和唯一信任自己的人"
          value={currentCharacter.protectTarget}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { protectTarget: value })
              : onDraftChange({ ...draft, protectTarget: value })
          }
          disabled={downstreamLocked}
        />
        <WorkspaceInput
          label="一碰就炸的点"
          placeholder="例：别人动到小柔或想抢钥匙，他就会失控亮底"
          value={currentCharacter.conflictTrigger}
          onChange={(value) =>
            editingIndex !== null
              ? onCharacterChange(editingIndex, { conflictTrigger: value })
              : onDraftChange({ ...draft, conflictTrigger: value })
          }
          disabled={downstreamLocked}
        />
      </div>

      <WorkspaceInput
        label="人物小传"
        placeholder="例：玄玉宫第十九徒，表面隐忍低调，实则藏武护钥匙。外界都当他是废人，只有在关键时刻才会一步步亮底。"
        value={currentCharacter.biography}
        onChange={(value) =>
          editingIndex !== null
            ? onCharacterChange(editingIndex, { biography: value })
            : onDraftChange({ ...draft, biography: value })
        }
        multiline
        rows={4}
        hint="把这个人的身份、关系、秘密和关键转折说清楚。"
        disabled={downstreamLocked}
      />

      <WorkspaceInput
        label="核心优势"
        placeholder="例：拥有婚约文件原件，头脑冷静能在高压下反杀"
        value={currentCharacter.advantage}
        onChange={(value) =>
          editingIndex !== null
            ? onCharacterChange(editingIndex, { advantage: value })
            : onDraftChange({ ...draft, advantage: value })
        }
        multiline
        rows={2}
        hint="人物最擅长什么？在关键时刻 TA 靠什么反败为胜？"
        disabled={downstreamLocked}
      />

      <WorkspaceInput
        label="性格短板"
        placeholder="例：太在意父亲的评价，容易被亲情威胁牵制"
        value={currentCharacter.weakness}
        onChange={(value) =>
          editingIndex !== null
            ? onCharacterChange(editingIndex, { weakness: value })
            : onDraftChange({ ...draft, weakness: value })
        }
        multiline
        rows={2}
        hint="人物的致命弱点是什么？对手会如何利用它？"
        disabled={downstreamLocked}
      />

      <WorkspaceInput
        label="成长弧光"
        placeholder="例：从被动承受→主动出击→完成内心蜕变，宣告价值觉醒"
        value={currentCharacter.arc}
        onChange={(value) =>
          editingIndex !== null
            ? onCharacterChange(editingIndex, { arc: value })
            : onDraftChange({ ...draft, arc: value })
        }
        multiline
        rows={3}
        hint="人物在这一季里会经历什么样的心理转变？"
        disabled={downstreamLocked}
      />
    </div>
  )
}
