/**
 * Gameplay 3 — Defend the Interpretation (storyboard §6 Scene 4).
 * Jigsaw on the interpretation map → structured memo → peer-review gate →
 * Dr. Marsh's challenges (if unlocked) → ending.
 */
import { useProject, nodeId } from '../store/project'
import { useSession } from './session'
import { COPY3 } from '../content/script'
import { checkJigsaw, generateChallenges, peerReviewGate, rateResponse, trajectory } from './analysis'
import { checkpoint, enterScene, finishSimulation, MAP_ID, openMapFullWidth, recomputeEvidenceTrail } from './flow'

const P = () => useProject.getState()
const S = () => useSession.getState()

export function startGP3() {
  enterScene('GAMEPLAY-3')
  const p = P()
  p.ensureNetwork(MAP_ID, 'Interpretation map')
  p.addNode(MAP_ID, 'theme', 'THEME', 460, 240)
  // categories arrive around the theme, unlinked: the learner assembles the jigsaw
  p.codeGroups.forEach((g, i) => {
    const a = (Math.PI * 2 * i) / Math.max(1, p.codeGroups.length) - Math.PI / 2
    P().addNode(MAP_ID, 'codeGroup', g.id, 460 + Math.cos(a) * 240, 240 + Math.sin(a) * 170)
  })
  S().patch({ sequence: 'GP3', gp3Phase: 'jigsaw', consequence: null })
  S().log('GP3', 'Gameplay 3 begins: jigsaw, memo, peer challenge.')
  recomputeEvidenceTrail()
  openMapFullWidth()
  // replay point: the start of Gameplay 3, after the sequence is set up
  checkpoint('GP3')
}

export function jigsawStatus() {
  const p = P()
  return checkJigsaw(
    p.networks.find((n) => n.id === MAP_ID),
    p.codeGroups,
    p.quotations,
    p.codings,
    p.docs,
  )
}

export function toMemo() {
  const j = jigsawStatus()
  S().patch({ gp3Phase: 'memo', jigsawCompleteness: j.completeness })
  S().log('S6', `Jigsaw ${Math.round(j.completeness * 100)}% linked${j.missing.length ? `; open: ${j.missing.join('; ')}` : ''}`)
  P().openTab({ kind: 'memoEditor' }, 0)
}

export function memoText() {
  const m = S().memo
  const q = P().quotations.find((x) => x.id === m.strongestEvidence)
  const doc = q ? P().docs.find((d) => d.id === q.docId) : undefined
  return [
    `Theme claim: ${m.themeClaim}`,
    `Strongest supporting evidence: ${q ? `${doc?.participant} (${q.id}) ` : ''}${m.strongestEvidenceNote}`,
    `Reconciliation / evidence trail: ${m.reconciliationNote}`,
    `Negative case: ${m.negativeCaseTreatment}`,
    `Final interpretation: ${m.finalInterpretation}`,
  ]
}

/** Commit after Review → Confirm; the memo is then fixed and the gate is evaluated. */
export function submitMemo() {
  const s = S()
  const text = memoText()
  P().addMemo({ id: 'MEMO-INTERPRETATION', title: 'Interpretation memo — for the Dean', text, draft: false, type: 'Memo' })
  const j = jigsawStatus()
  const nodes = {
    S1: s.branchState.S1,
    S2: s.branchState.S2,
    S3_route: s.branchState.S3_route,
    S4: s.branchState.S4,
    S5: s.branchState.S5,
  }
  const gate = peerReviewGate(nodes, j, text.join(' '))
  const traj = trajectory(nodes)
  s.patch({
    memoStatus: 'submitted',
    jigsawCompleteness: j.completeness,
    branchState: { ...s.branchState, S6_trajectory: traj, S6_5_unlocked: gate.unlocked },
  })
  s.log('S6', `Memo submitted · trajectory ${traj} · gate: green majority ${gate.majorityGreen}, jigsaw ${gate.jigsaw}, memo names P4+P7 ${gate.memoOk} → ${gate.unlocked ? 'peer review unlocked' : 'straight to ending'}`)

  if (!gate.unlocked) return finishSimulation()

  // Challenges bind to the memo's strongest evidence, the jigsaw evidence and the top-ranked theme.
  const net = P().networks.find((n) => n.id === MAP_ID)
  const evidence = (net?.links ?? [])
    .flatMap((l) => [l.from, l.to])
    .filter((id) => id.startsWith('quotation:'))
    .map((id) => id.slice('quotation:'.length))
  const challenges = generateChallenges(
    s.memo.strongestEvidence,
    [...new Set(evidence)],
    s.theme?.claimPhrase ?? s.memo.themeClaim,
    P().quotations,
    P().docs,
    `${s.learnerId}`,
  )
  S().patch({
    challenges,
    challengeResponses: challenges.map((c) => ({ challengeId: c.id, evidenceQuotationId: null, posture: null, rationale: '' })),
    gp3Phase: 'review',
    unlockedContent: [...new Set([...S().unlockedContent, 'S6.5'])],
    consequence: { tone: 'bonus', title: COPY3.review.from, text: COPY3.review.intro },
  })
  S().log('S6.5', `Challenges generated: ${challenges.map((c) => c.id + ' ' + c.participant).join(', ')}`)
  P().openTab({ kind: 'peerReview' }, 0)
}

export function submitResponses() {
  const s = S()
  const rated = s.challengeResponses.map((r) => ({ ...r, quality: rateResponse(r.evidenceQuotationId, r.posture, r.rationale) }))
  s.patch({ challengeResponses: rated, gp3Phase: 'done' })
  s.log('S6.5', rated.map((r) => `${r.challengeId}: ${r.posture} → ${r.quality}`).join('; '))
  finishSimulation()
}

/** Network helpers used by the jigsaw list view. */
export const themeNode = nodeId('theme', 'THEME')
