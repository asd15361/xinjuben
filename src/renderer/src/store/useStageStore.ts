import { create } from 'zustand';
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'
import type { OutlineSeedDto } from '../../../shared/contracts/workspace'
import { ensureOutlineEpisodeShape } from '../../../shared/domain/workflow/outline-episodes'

export interface OutlineData extends OutlineDraftDto {}
export interface CharacterData extends CharacterDraftDto {}
export interface OutlineSegment extends DetailedOutlineSegmentDto {}
export interface ScriptSegment extends ScriptSegmentDto {}

function normalizeCharacter(input?: Partial<CharacterData> | null): CharacterData {
  return {
    name: input?.name?.trim() || '',
    biography: input?.biography?.trim() || '',
    publicMask: input?.publicMask?.trim() || '',
    hiddenPressure: input?.hiddenPressure?.trim() || '',
    fear: input?.fear?.trim() || '',
    protectTarget: input?.protectTarget?.trim() || '',
    conflictTrigger: input?.conflictTrigger?.trim() || '',
    advantage: input?.advantage?.trim() || '',
    weakness: input?.weakness?.trim() || '',
    goal: input?.goal?.trim() || '',
    arc: input?.arc?.trim() || ''
  }
}

function createEmptyOutline(): OutlineData {
  return {
    title: '',
    genre: '',
    theme: '',
    mainConflict: '',
    protagonist: '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

interface StageStore {
  outline: OutlineData;
  characters: CharacterData[];
  segments: OutlineSegment[];
  script: ScriptSegment[];
  
  setOutline: (data: Partial<OutlineData>) => void;
  hydrateProjectDrafts: (input: {
    outline?: OutlineData | null
    characters?: CharacterData[]
    segments?: OutlineSegment[]
    script?: ScriptSegment[]
  }) => void;
  applyOutlineSeed: (seed: OutlineSeedDto) => void;
  addCharacter: (c: CharacterData) => void;
  removeCharacter: (index: number) => void;
  replaceCharacters: (characters: CharacterData[]) => void;
  updateCharacter: (index: number, c: Partial<CharacterData>) => void;
  setSegment: (act: OutlineSegment['act'], content: string) => void;
  replaceSegments: (segments: OutlineSegment[]) => void;
  addScriptSegment: (s: ScriptSegment) => void;
  replaceScript: (script: ScriptSegment[]) => void;
  appendScriptSegments: (segments: ScriptSegment[]) => void;
  upsertScript: (script: ScriptSegment[]) => void;
  reset: () => void;
}

export const useStageStore = create<StageStore>((set) => ({
  outline: createEmptyOutline(),
  characters: [],
  segments: [],
  script: [],

  setOutline: (data) =>
    set((state) => ({ outline: ensureOutlineEpisodeShape({ ...state.outline, ...data }) })),

  hydrateProjectDrafts: (input) =>
    set(() => ({
      outline: input.outline ? ensureOutlineEpisodeShape(input.outline) : createEmptyOutline(),
      characters: (input.characters ?? []).map((item) => normalizeCharacter(item)),
      segments: input.segments ?? [],
      script: input.script ?? []
    })),

  applyOutlineSeed: (seed) =>
    set((state) => ({
      outline: {
        ...state.outline,
        title: seed.title,
        genre: seed.genre,
        theme: seed.theme,
        mainConflict: seed.mainConflict,
        protagonist: seed.protagonist
      }
    })),

  addCharacter: (c) =>
    set((state) => ({ characters: [...state.characters, normalizeCharacter(c)] })),

  removeCharacter: (index) =>
    set((state) => ({ characters: state.characters.filter((_, currentIndex) => currentIndex !== index) })),

  replaceCharacters: (characters) =>
    set(() => ({ characters: characters.map((item) => normalizeCharacter(item)) })),

  updateCharacter: (index, c) =>
    set((state) => {
      const updated = [...state.characters];
      updated[index] = normalizeCharacter({ ...updated[index], ...c });
      return { characters: updated };
    }),

  setSegment: (act, content) =>
    set((state) => {
      const existing = state.segments.findIndex((s) => s.act === act);
      if (existing >= 0) {
        const updated = [...state.segments];
        updated[existing] = { ...updated[existing], content };
        return { segments: updated };
      }
      return {
        segments: [...state.segments, { act, content, hookType: '' }],
      };
    }),

  replaceSegments: (segments) =>
    set(() => ({ segments })),

  addScriptSegment: (s) =>
    set((state) => ({ script: [...state.script, s] })),

  replaceScript: (script) =>
    set(() => ({ script })),

  appendScriptSegments: (segments) =>
    set((state) => ({ script: [...state.script, ...segments] })),

  upsertScript: (script) =>
    set(() => ({ script })),

  reset: () =>
    set(() => ({
      outline: createEmptyOutline(),
      characters: [],
      segments: [],
      script: []
    })),
}));
