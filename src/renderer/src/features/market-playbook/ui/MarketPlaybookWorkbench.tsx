import { useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { CheckCircle2, FileUp, FlaskConical, RotateCcw, Sparkles } from 'lucide-react'
import type {
  AudienceLane,
  MarketPlaybookDraftDto,
  MarketPatternDto
} from '../../../../../shared/contracts/market-playbook.ts'
import {
  createMarketPlaybookDraftFromSamples,
  createSourceSample
} from '../../../../../shared/domain/market-playbook/create-draft-from-samples.ts'
import {
  applyMarketPlaybookReviewEdits,
  buildMarketPlaybookActivationPreview
} from '../../../../../shared/domain/market-playbook/review-workbench.ts'
import { inspectPlaybookAlignment } from '../../../../../shared/domain/market-playbook/playbook-alignment.ts'
import { apiSaveActiveMarketPlaybook } from '../../../services/api-client.ts'

type SubgenreOption =
  | '男频都市逆袭'
  | '男频玄幻修仙'
  | '男频历史军政'
  | '女频霸总甜宠'
  | '女频古言宅斗'
  | '女频现代逆袭'

interface PatternEditState {
  id: string
  name: string
  promptInstruction: string
  qualitySignal: string
}

const maleSubgenres: SubgenreOption[] = ['男频都市逆袭', '男频玄幻修仙', '男频历史军政']
const femaleSubgenres: SubgenreOption[] = ['女频霸总甜宠', '女频古言宅斗', '女频现代逆袭']

const samplePlaceholder =
  '把优秀短剧/漫剧样本文本粘到这里。建议一次放 1-3 集关键片段，包含开局压迫、爽点、集尾钩子、反派手段。'

export function MarketPlaybookWorkbench(): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState('市场打法包草案')
  const [audienceLane, setAudienceLane] = useState<AudienceLane>('male')
  const [subgenre, setSubgenre] = useState<SubgenreOption>('男频玄幻修仙')
  const [sourceMonth, setSourceMonth] = useState(resolveCurrentMonth())
  const [version, setVersion] = useState('draft-1')
  const [sampleName, setSampleName] = useState('优秀剧本样本.txt')
  const [sampleText, setSampleText] = useState('')
  const [draft, setDraft] = useState<MarketPlaybookDraftDto | null>(null)
  const [patternEdits, setPatternEdits] = useState<PatternEditState[]>([])
  const [antiPatternsText, setAntiPatternsText] = useState('')
  const [reviewNotesText, setReviewNotesText] = useState('')
  const [status, setStatus] = useState('还没有生成草案')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const availableSubgenres = audienceLane === 'male' ? maleSubgenres : femaleSubgenres
  const reviewedDraft = useMemo(() => {
    if (!draft) return null
    return applyMarketPlaybookReviewEdits({
      draft,
      name,
      sourceMonth,
      version,
      patterns: patternEdits,
      antiPatternsText,
      reviewNotesText
    })
  }, [antiPatternsText, draft, name, patternEdits, reviewNotesText, sourceMonth, version])
  const preview = useMemo(() => {
    if (!reviewedDraft) return null
    return buildMarketPlaybookActivationPreview({
      draft: reviewedDraft,
      existingActivePlaybooks: []
    })
  }, [reviewedDraft])
  const activeJson = preview?.playbook ? JSON.stringify(preview.playbook, null, 2) : ''
  const alignmentScore = useMemo(() => {
    if (!preview?.playbook || !sampleText.trim()) return null
    return inspectPlaybookAlignment({ text: sampleText, playbook: preview.playbook })?.score ?? null
  }, [preview?.playbook, sampleText])

  function createDraft(): void {
    setError('')
    try {
      const sample = createSourceSample({
        name: sampleName.trim() || '优秀剧本样本.txt',
        contentText: sampleText,
        sourceType: 'manual',
        audienceLane,
        subgenre
      })
      const nextDraft = createMarketPlaybookDraftFromSamples({
        samples: [sample],
        name,
        audienceLane,
        subgenre,
        sourceMonth,
        version
      })
      setDraft(nextDraft)
      setPatternEdits(
        nextDraft.extractedPatterns.map((pattern) => ({
          id: pattern.id,
          name: pattern.name,
          promptInstruction: pattern.promptInstruction,
          qualitySignal: pattern.qualitySignal
        }))
      )
      setAntiPatternsText(nextDraft.antiPatterns.join('\n'))
      setReviewNotesText('已人工审核：待确认。')
      setStatus(`已提取 ${nextDraft.extractedPatterns.length} 条打法，下一步人工审核。`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '草案生成失败')
      setStatus('草案生成失败')
    }
  }

  function resetWorkbench(): void {
    setDraft(null)
    setPatternEdits([])
    setAntiPatternsText('')
    setReviewNotesText('')
    setStatus('还没有生成草案')
    setError('')
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return
    const text = await file.text()
    setSampleName(file.name)
    setSampleText(text)
    setStatus(`已载入 ${file.name}，可以生成草案。`)
    setError('')
  }

  function updatePattern(id: string, patch: Partial<PatternEditState>): void {
    setPatternEdits((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function copyActiveJson(): Promise<void> {
    if (!activeJson) return
    await navigator.clipboard?.writeText(activeJson)
    setStatus('active playbook JSON 已复制。')
  }

  async function saveActivePlaybook(): Promise<void> {
    if (!preview?.playbook) return
    setError('')
    try {
      const result = await apiSaveActiveMarketPlaybook({ playbook: preview.playbook })
      setStatus(`已保存 active playbook，可用于新项目：${result.selection.selectedPlaybookId}`)
      await navigator.clipboard?.writeText(JSON.stringify(result.selection, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存 active playbook 失败')
      setStatus('保存失败')
    }
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl border border-orange-500/20 bg-orange-500/10 flex items-center justify-center text-orange-300">
            <FlaskConical size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">
              市场学习
            </p>
            <h3 className="text-sm font-black text-white truncate">MarketPlaybook 审核工作台</h3>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[10px] text-white/35">
          <span>{status}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-white/45">
            {expanded ? '收起' : '展开'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="打法包名称" value={name} onChange={setName} />
              <TextField label="版本" value={version} onChange={setVersion} />
              <SelectField
                label="赛道"
                value={audienceLane}
                onChange={(value) => {
                  const lane = value as AudienceLane
                  setAudienceLane(lane)
                  setSubgenre(lane === 'male' ? maleSubgenres[0] : femaleSubgenres[0])
                }}
                options={[
                  { value: 'male', label: '男频' },
                  { value: 'female', label: '女频' }
                ]}
              />
              <SelectField
                label="垂类"
                value={subgenre}
                onChange={(value) => setSubgenre(value as SubgenreOption)}
                options={availableSubgenres.map((item) => ({ value: item, label: item }))}
              />
              <TextField label="来源月份" value={sourceMonth} onChange={setSourceMonth} />
              <TextField label="样本名" value={sampleName} onChange={setSampleName} />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                  样本文本
                </p>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="hidden"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white/75"
                  >
                    <FileUp size={13} />
                    导入
                  </button>
                  <button
                    type="button"
                    onClick={resetWorkbench}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white/75"
                  >
                    <RotateCcw size={13} />
                    重置
                  </button>
                </div>
              </div>
              <textarea
                value={sampleText}
                onChange={(event) => setSampleText(event.target.value)}
                placeholder={samplePlaceholder}
                className="min-h-[220px] w-full resize-none rounded-lg border border-white/8 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-white/80 placeholder-white/20 focus:outline-none focus:border-orange-500/30"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className={`text-[11px] ${error ? 'text-rose-300' : 'text-white/35'}`}>
                  {error || `当前样本 ${sampleText.length} 字符，至少需要 100 字符。`}
                </p>
                <button
                  type="button"
                  onClick={createDraft}
                  className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-[11px] font-black text-[#050505] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                  disabled={sampleText.trim().length < 100}
                >
                  生成草案
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            {!draft && (
              <EmptyState />
            )}

            {draft && (
              <>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                      人工审核
                    </p>
                    <span className="text-[10px] text-white/35">
                      {patternEdits.length} 条打法，启用前必须逐条看
                    </span>
                  </div>
                  <div className="max-h-[330px] overflow-auto pr-1 space-y-3">
                    {draft.extractedPatterns.map((pattern) => {
                      const edit = patternEdits.find((item) => item.id === pattern.id)
                      return (
                        <PatternEditor
                          key={pattern.id}
                          pattern={pattern}
                          edit={edit}
                          onChange={(patch) => updatePattern(pattern.id, patch)}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <TextAreaField
                    label="禁止反模式"
                    value={antiPatternsText}
                    onChange={setAntiPatternsText}
                    minHeight="110px"
                  />
                  <TextAreaField
                    label="审核备注"
                    value={reviewNotesText}
                    onChange={setReviewNotesText}
                    minHeight="110px"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                        启用预览
                      </p>
                      <p className="mt-1 text-[11px] text-white/40">
                        这是 active JSON 预览；保存启用后，新项目会按赛道和垂类自动选用最新版本。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill
                        ok={preview?.validation.valid === true}
                        label={preview?.validation.valid ? '可启用' : '需修正'}
                      />
                      <button
                        type="button"
                        onClick={() => void copyActiveJson()}
                        disabled={!activeJson}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white/75 disabled:opacity-40"
                      >
                        <CheckCircle2 size={13} />
                        复制 JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveActivePlaybook()}
                        disabled={!preview?.playbook}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-black text-[#050505] hover:opacity-90 disabled:opacity-40"
                      >
                        <CheckCircle2 size={13} />
                        保存启用
                      </button>
                    </div>
                  </div>

                  {preview && !preview.validation.valid && (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-200 space-y-1">
                      {preview.validation.issues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  )}

                  {preview?.playbook && (
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-black mb-2">
                          Prompt 预览
                        </p>
                        <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/55">
                          {preview.promptPreview}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25 font-black mb-2">
                          Active JSON
                        </p>
                        <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/55">
                          {activeJson}
                        </pre>
                      </div>
                    </div>
                  )}

                  {alignmentScore != null && (
                    <p className="text-[11px] text-white/40">
                      当前样本对齐度观测：<span className="text-orange-300">{alignmentScore}</span>
                      /100，仅用于观察，不进入总分和修稿链。
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/25 font-black">
        {props.label}
      </span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/80 focus:outline-none focus:border-orange-500/30"
      />
    </label>
  )
}

function SelectField(props: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/25 font-black">
        {props.label}
      </span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/80 focus:outline-none focus:border-orange-500/30"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField(props: {
  label: string
  value: string
  minHeight: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="block rounded-xl border border-white/10 bg-black/20 p-3">
      <span className="mb-2 block text-[10px] uppercase tracking-widest text-white/25 font-black">
        {props.label}
      </span>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        style={{ minHeight: props.minHeight }}
        className="w-full resize-none rounded-lg border border-white/8 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-white/75 focus:outline-none focus:border-orange-500/30"
      />
    </label>
  )
}

function PatternEditor(props: {
  pattern: MarketPatternDto
  edit: PatternEditState | undefined
  onChange: (patch: Partial<PatternEditState>) => void
}): JSX.Element {
  const edit = props.edit
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black text-white/80">{edit?.name || props.pattern.name}</p>
          <p className="mt-1 text-[10px] text-white/35">
            {props.pattern.type} · {props.pattern.description}
          </p>
        </div>
        <Sparkles size={14} className="text-orange-300 shrink-0" />
      </div>
      <TextAreaInline
        value={edit?.promptInstruction || ''}
        onChange={(value) => props.onChange({ promptInstruction: value })}
        placeholder="Prompt 指令"
      />
      <TextAreaInline
        value={edit?.qualitySignal || ''}
        onChange={(value) => props.onChange({ qualitySignal: value })}
        placeholder="观测信号"
      />
    </div>
  )
}

function TextAreaInline(props: {
  value: string
  placeholder: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <textarea
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      className="min-h-[58px] w-full resize-none rounded-lg border border-white/8 bg-black/20 p-2 text-[11px] leading-relaxed text-white/70 placeholder-white/20 focus:outline-none focus:border-orange-500/30"
    />
  )
}

function StatusPill(props: { ok: boolean; label: string }): JSX.Element {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black ${
        props.ok
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      }`}
    >
      {props.label}
    </span>
  )
}

function EmptyState(): JSX.Element {
  return (
    <div className="h-full min-h-[360px] rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <FlaskConical className="mx-auto text-white/20 mb-4" size={28} />
        <p className="text-sm font-black text-white/70">先导入样本生成草案</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          草案只是一份候选打法包，必须经过人工审核后才生成 active JSON。
        </p>
      </div>
    </div>
  )
}

function resolveCurrentMonth(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}
