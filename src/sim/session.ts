import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from '../store/storage'
import type { DivergenceClass, P7Outcome } from '../content/answerKey'
import type {
  Challenge,
  CountRisk,
  Handling,
  Posture,
  ResponseQuality,
  S1,
  S2,
  S3Route,
  S4Logic,
  S4State,
} from './analysis'

/**
 * Simulation session state (storyboard §10.3). The ATLAS.ti project data lives
 * in store/project.ts; this holds the learner, where they are in the five
 * top-level sequences, branch state, meters, artifacts and the audit trail.
 */
export type Stage = 'opener' | 'walkthrough' | 'landing' | 'welcome' | 'workspace' | 'ending'
export type SceneId = 'INTRO' | 'GAMEPLAY-1' | 'GAMEPLAY-2' | 'GAMEPLAY-3' | 'ENDING'
export type Sequence = 'GP1' | 'GP2' | 'GP3'

export type GP1Phase = 'A' | 'B' | 'C' | 'S3A' | 'S3C' | 'done'
export type GP2Phase = 'count' | 'sort' | 'rank' | 'stress' | 'done'
export type GP3Phase = 'jigsaw' | 'memo' | 'review' | 'done'

export type Tone = 'strong' | 'developing' | 'weak' | 'bonus' | 'remedial' | 'neutral' | 'negative'

export interface Consequence {
  tone: Tone
  title: string
  text: string
}

export interface AuditEntry {
  t: number
  kind: string
  detail: string
}

export type Flag =
  | 'blended'
  | 'fragmented'
  | 'overload'
  | 'cannot-generalise'
  | 'reliability-check-incomplete'
  | 'field-tested-codebook'
  | 'vague'
  | 'count-overgeneralised'
  | 'count-fragmented'
  | 'overcorrected'
  | 'inflated'
  | 'theme-misranked'

export interface BranchState {
  S1?: S1
  S2?: S2
  S3_aggregate?: { P2: Handling; P4: Handling; P5: Handling }
  S3_route?: S3Route
  S4?: S4State
  S4_categoryCount?: number
  S4_logic?: S4Logic
  S4_countRisk?: CountRisk
  S5?: P7Outcome
  S5_fieldNotesUsed?: boolean
  S6_trajectory?: 'green' | 'mixed' | 'weak'
  S6_5_unlocked?: boolean
}

export interface ReconAnswer {
  cls: DivergenceClass | null
  action: string | null
}

export interface CodebookEntry {
  codeId: string
  label: string
  type?: string
  colorHex?: string
  excerptRefs: string[]
}

export interface CategoryDraft {
  id: string
  name: string
  memberCodeIds: string[]
}

export interface CategoryRecord extends CategoryDraft {
  coherenceScore: number
}

export interface ThemeRecord {
  themeId: string
  label: string
  statement: string
  claimPhrase: string
  ranking: string[]
  p7Handling: P7Outcome
  misranked: boolean
}

export interface MemoRecord {
  themeClaim: string
  strongestEvidence: string | null
  strongestEvidenceNote: string
  reconciliationNote: string
  negativeCaseTreatment: string
  finalInterpretation: string
}

export interface ChallengeResponse {
  challengeId: string
  evidenceQuotationId: string | null
  posture: Posture | null
  rationale: string
  quality?: ResponseQuality
}

export interface Checkpoint {
  project: unknown
  session: unknown
  at: number
}

interface SessionState {
  stage: Stage
  learnerId: string | null
  learnerName: string
  caseStarted: boolean
  sceneHistory: SceneId[]
  handoffRead: boolean
  sequence: Sequence

  gp1Phase: GP1Phase
  gp2Phase: GP2Phase
  gp3Phase: GP3Phase
  branchState: BranchState
  meters: {
    codebookConfidence: number | null
    categoryCoherence: number | null
    themeIntegrity: number | null
    evidenceTrailCompleteness: number
  }
  flags: Flag[]
  unlockedContent: string[]
  recon: Record<'P2' | 'P4' | 'P5', ReconAnswer>
  p8: { status: 'locked' | 'open' | 'success' | 'fail'; codeIdsBefore: string[] }
  codebook: CodebookEntry[]
  earlyFieldNotePreview: boolean

  categoryCount: number | null
  categoriesDraft: CategoryDraft[]
  categories: CategoryRecord[]
  themeRanking: string[]
  p7: { step1: string | null; step2: string | null }
  theme: ThemeRecord | null
  jigsawCompleteness: number
  memo: MemoRecord
  memoStatus: 'draft' | 'review' | 'submitted'
  challenges: Challenge[]
  challengeResponses: ChallengeResponse[]
  reflections: { a: string; b: string }
  simulationComplete: boolean
  checkpoints: Partial<Record<Sequence, Checkpoint>>

  consequence: Consequence | null
  audit: AuditEntry[]

  setStage: (s: Stage) => void
  setLearner: (name: string) => void
  startCase: () => void
  restart: () => void
  patch: (p: Partial<SessionState>) => void
  log: (kind: string, detail: string) => void
  setRecon: (p: 'P2' | 'P4' | 'P5', a: Partial<ReconAnswer>) => void
  addFlag: (f: Flag) => void
  clearFlag: (f: Flag) => void
  setMemo: (m: Partial<MemoRecord>) => void
  setResponse: (id: string, r: Partial<ChallengeResponse>) => void
}

export const EMPTY_MEMO: MemoRecord = {
  themeClaim: '',
  strongestEvidence: null,
  strongestEvidenceNote: '',
  reconciliationNote: '',
  negativeCaseTreatment: '',
  finalInterpretation: '',
}

const initial = {
  stage: 'opener' as Stage,
  learnerId: null as string | null,
  learnerName: '',
  caseStarted: false,
  sceneHistory: [] as SceneId[],
  handoffRead: false,
  sequence: 'GP1' as Sequence,
  gp1Phase: 'A' as GP1Phase,
  gp2Phase: 'count' as GP2Phase,
  gp3Phase: 'jigsaw' as GP3Phase,
  branchState: {} as BranchState,
  meters: { codebookConfidence: null, categoryCoherence: null, themeIntegrity: null, evidenceTrailCompleteness: 0 } as SessionState['meters'],
  flags: [] as Flag[],
  unlockedContent: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  recon: {
    P2: { cls: null, action: null },
    P4: { cls: null, action: null },
    P5: { cls: null, action: null },
  } as Record<'P2' | 'P4' | 'P5', ReconAnswer>,
  p8: { status: 'locked' as const, codeIdsBefore: [] as string[] },
  codebook: [] as CodebookEntry[],
  earlyFieldNotePreview: false,
  categoryCount: null as number | null,
  categoriesDraft: [] as CategoryDraft[],
  categories: [] as CategoryRecord[],
  themeRanking: [] as string[],
  p7: { step1: null, step2: null } as SessionState['p7'],
  theme: null as ThemeRecord | null,
  jigsawCompleteness: 0,
  memo: EMPTY_MEMO,
  memoStatus: 'draft' as SessionState['memoStatus'],
  challenges: [] as Challenge[],
  challengeResponses: [] as ChallengeResponse[],
  reflections: { a: '', b: '' },
  simulationComplete: false,
  checkpoints: {} as SessionState['checkpoints'],
  consequence: null as Consequence | null,
  audit: [] as AuditEntry[],
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...initial,
      setStage: (stage) => set({ stage }),
      setLearner: (name) =>
        set((s) => ({
          learnerName: name.trim(),
          learnerId: s.learnerId ?? `L-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      startCase: () =>
        set((s) => ({
          caseStarted: true,
          handoffRead: true,
          stage: 'workspace',
          sceneHistory: [...new Set<SceneId>([...s.sceneHistory, 'INTRO', 'GAMEPLAY-1'])],
          audit: [...s.audit, { t: Date.now(), kind: 'case', detail: 'Case opened; Gameplay 1 begins.' }],
        })),
      restart: () => set({ ...initial }),
      patch: (p) => set(p),
      log: (kind, detail) => set((s) => ({ audit: [...s.audit, { t: Date.now(), kind, detail }] })),
      setRecon: (p, a) => set((s) => ({ recon: { ...s.recon, [p]: { ...s.recon[p], ...a } } })),
      addFlag: (f) => set((s) => ({ flags: s.flags.includes(f) ? s.flags : [...s.flags, f] })),
      clearFlag: (f) => set((s) => ({ flags: s.flags.filter((x) => x !== f) })),
      setMemo: (m) => set((s) => ({ memo: { ...s.memo, ...m } })),
      setResponse: (id, r) =>
        set((s) => ({
          challengeResponses: s.challengeResponses.some((x) => x.challengeId === id)
            ? s.challengeResponses.map((x) => (x.challengeId === id ? { ...x, ...r } : x))
            : [...s.challengeResponses, { challengeId: id, evidenceQuotationId: null, posture: null, rationale: '', ...r }],
        })),
    }),
    {
      name: 'qcs-session-v1',
      storage: createJSONStorage(safeStorage),
      // older saves lack the newer fields; fill them from the defaults
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        meters: { ...initial.meters, ...((persisted as Partial<SessionState>)?.meters ?? {}) },
      }),
    },
  ),
)

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Coding commands stay closed while the learner is segmenting (Scene 1: "highlight without interpreting yet"). */
export const codingLocked = () => {
  const s = useSession.getState()
  return s.stage === 'workspace' && s.sequence === 'GP1' && s.gp1Phase === 'A'
}
