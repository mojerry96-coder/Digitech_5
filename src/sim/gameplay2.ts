/**
 * Gameplay 2 — Build and Stress-Test the Interpretation (storyboard §6 Scene 3).
 * Category count → Sort into Bins (ATLAS.ti Code Groups) → rank themes →
 * P7 arrives → stress test; optional Connect the Dots on the theme map.
 */
import { useProject } from '../store/project'
import { useSession, type CategoryDraft } from './session'
import { useUI } from '../store/ui'
import { documents } from '../content/draftDataset'
import { CANDIDATE_THEMES, INTEGRATED_STATEMENT, NARROWED_STATEMENT } from '../content/answerKey'
import { COPY2, EXACT2 } from '../content/script'
import { classifyS4, countRisk, resolveS5, S5_INTEGRITY } from './analysis'
import { checkpoint, enterScene, fieldNotesLinked, FIELD_NOTE_IDS, MAP_ID, openBinsFullWidth, openMapFullWidth } from './flow'

const P = () => useProject.getState()
const S = () => useSession.getState()

export function startGP2() {
  enterScene('GAMEPLAY-2')
  S().patch({
    sequence: 'GP2',
    gp2Phase: 'count',
    consequence: null,
    // the supported theme never starts in first place
    themeRanking: [...CANDIDATE_THEMES.filter((t) => !t.correct), ...CANDIDATE_THEMES.filter((t) => t.correct)].map((t) => t.id),
  })
  S().log('GP2', 'Gameplay 2 begins: categories and themes.')
  if (!useUI.getState().focusMode) P().openTab({ kind: 'codeManager' }, 1)
  // replay point: the start of Gameplay 2, after the sequence is set up
  checkpoint('GP2')
}

/** Codes eligible for categorising: the learner's codebook as it stands. */
export function categorisableCodes() {
  const p = P()
  return p.codes.filter((c) => !c.suggested && p.codings.some((k) => k.codeId === c.id && k.coder === p.currentUser))
}

/** Every code sorted and every container used — the same rule as the board's own Finish button. */
export function categoriesReady(draft: CategoryDraft[]) {
  const placed = new Set(draft.flatMap((c) => c.memberCodeIds))
  return draft.length > 0 && draft.every((c) => c.memberCodeIds.length > 0) && categorisableCodes().every((c) => placed.has(c.id))
}

function resizeDraft(n: number, current: CategoryDraft[]): CategoryDraft[] {
  const next = current.slice(0, n)
  for (let i = next.length; i < n; i++) next.push({ id: `CG${i + 1}`, name: `Category ${i + 1}`, memberCodeIds: [] })
  return next
}

export function confirmCount(n: number) {
  const s = S()
  const risk = countRisk(n)
  s.patch({ categoryCount: n, categoriesDraft: resizeDraft(n, s.categoriesDraft), gp2Phase: 'sort' })
  s.log('S4', `Category count set to ${n}${risk !== 'none' ? ` (${risk} warning shown)` : ''}`)
  openBinsFullWidth()
}

/** Changing the count inside Sort into Bins keeps placements in surviving containers. */
export function changeCount(n: number) {
  const s = S()
  s.patch({ categoryCount: n, categoriesDraft: resizeDraft(n, s.categoriesDraft) })
  s.log('S4', `Category count changed to ${n}`)
}

export function assignCode(codeId: string, categoryId: string | null) {
  const s = S()
  s.patch({
    categoriesDraft: s.categoriesDraft.map((c) => ({
      ...c,
      memberCodeIds: c.id === categoryId ? [...new Set([...c.memberCodeIds, codeId])] : c.memberCodeIds.filter((x) => x !== codeId),
    })),
  })
}

export function renameCategory(id: string, name: string) {
  const s = S()
  s.patch({ categoriesDraft: s.categoriesDraft.map((c) => (c.id === id ? { ...c, name } : c)) })
}

export function finishCategories() {
  const p = P()
  const s = S()
  const count = s.categoryCount ?? s.categoriesDraft.length
  const groups = s.categoriesDraft.map((c) => ({ id: c.id, name: c.name.trim() || c.id, memberCodeIds: c.memberCodeIds }))
  const r = classifyS4(count, groups, p.docs, p.quotations, p.codes, p.codings, p.currentUser)
  p.setCodeGroups(groups) // the categories become real ATLAS.ti Code Groups
  s.patch({
    categories: groups.map((g, i) => ({ ...g, coherenceScore: r.groupScores[i]?.score ?? 0 })),
    branchState: { ...s.branchState, S4: r.state, S4_categoryCount: count, S4_logic: r.logic, S4_countRisk: r.countRisk },
    meters: { ...s.meters, categoryCoherence: r.coherence },
    gp2Phase: 'rank',
  })
  if (r.logic === 'outcome') s.addFlag('vague')
  if (r.countRisk === 'overgeneralised') s.addFlag('count-overgeneralised')
  if (r.countRisk === 'fragmented') s.addFlag('count-fragmented')
  if (r.countRisk !== 'none') s.log('S4', `Learner proceeded with an out-of-range count (${count})`)
  s.log('S4', `${r.state} · logic ${r.logic} · count risk ${r.countRisk} → coherence ${r.coherence} (mechanism share ${Math.round(r.mechanismShare * 100)}%)`)
  const tone = r.coherence >= 85 ? 'strong' : r.coherence >= 55 ? 'developing' : 'weak'
  const copy = r.state === 'S4-Mechanism' ? COPY2.s4.mechanism : r.state === 'S4-Outcome' ? COPY2.s4.outcome : r.logic === 'outcome' ? COPY2.s4.miscountOutcome : COPY2.s4.miscount
  S().patch({ consequence: { tone, ...copy } })
}

export function setRanking(order: string[]) {
  S().patch({ themeRanking: order })
}

/** Confirming the ranking is the moment P7 arrives as the late negative case. */
export function confirmRanking() {
  const s = S()
  s.log('S5', `Themes ranked: ${s.themeRanking.join(' > ')}`)
  const src = documents.find((d) => d.participant === 'P7')!
  P().addDocument({
    id: 7,
    name: src.title,
    participant: 'P7',
    paragraphs: src.paragraphs,
    draft: src.draft,
    groups: [src.year, src.faculty],
  })
  const p = P()
  p.ensureNetwork(MAP_ID, 'Interpretation map')
  p.addNode(MAP_ID, 'theme', 'THEME', 420, 220)
  FIELD_NOTE_IDS.forEach((id, i) => p.addNode(MAP_ID, 'memo', id, 120, 120 + i * 180))
  s.patch({
    gp2Phase: 'stress',
    unlockedContent: [...new Set([...s.unlockedContent, 'P7'])],
    consequence: { tone: 'negative', title: EXACT2.p7ArrivesTitle, text: COPY2.p7Arrives },
  })
  s.log('P7', 'P7 (late negative case) added to the project.')
  p.openTab({ kind: 'document', id: 7 }, 0)
}

export function setP7(step: 'step1' | 'step2', value: string) {
  const s = S()
  s.patch({ p7: step === 'step1' ? { step1: value, step2: null } : { ...s.p7, step2: value } })
}

export function commitStressTest() {
  const s = S()
  const top = CANDIDATE_THEMES.find((t) => t.id === s.themeRanking[0])!
  const { outcome, misranked } = resolveS5(top.id, s.p7.step1, s.p7.step2)
  const statement = outcome === 'integrated' ? (top.correct ? INTEGRATED_STATEMENT : top.statement) : outcome === 'narrowed' && top.correct ? NARROWED_STATEMENT : top.statement
  s.patch({
    theme: { themeId: top.id, label: top.label, statement, claimPhrase: top.claimPhrase, ranking: s.themeRanking, p7Handling: outcome, misranked },
    branchState: { ...s.branchState, S5: outcome, S5_fieldNotesUsed: fieldNotesLinked() > 0 },
    meters: { ...s.meters, themeIntegrity: S5_INTEGRITY[outcome] },
    gp2Phase: 'done',
  })
  if (outcome === 'narrowed') S().addFlag('overcorrected')
  if (outcome === 'dismissed') S().addFlag('inflated')
  if (misranked) S().addFlag('theme-misranked')
  S().log('S5', `Top theme “${top.label}” · P7 ${s.p7.step1}/${s.p7.step2 ?? '—'} → ${outcome}${misranked ? ' (top theme misranked)' : ''} → integrity ${S5_INTEGRITY[outcome]}`)
  const copy = outcome === 'integrated' ? COPY2.s5.integrated : outcome === 'narrowed' ? { title: COPY2.s5.narrowedTitle, text: misranked ? COPY2.s5.misranked : EXACT2.narrowedFeedback } : COPY2.s5.dismissed
  S().patch({ consequence: { tone: outcome === 'integrated' ? 'strong' : outcome === 'narrowed' ? 'developing' : 'weak', ...copy } })
}

export function openThemeMap() {
  openMapFullWidth()
}
