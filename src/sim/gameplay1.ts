/**
 * Gameplay 1 — Build the Codebook. Phase transitions and their effects on the
 * ATLAS.ti project, following storyboard §6 Scene 2 and §10.2.
 */
import { useProject, codeColour, getDocText, type Quotation } from '../store/project'
import { useSession, type CodebookEntry } from './session'
import { useUI } from '../store/ui'
import { documents } from '../content/draftDataset'
import {
  DIVERGENCES,
  SUGGESTIONS_COARSE,
  SUGGESTIONS_FRAGMENTED,
  SUGGESTIONS_STRONG,
} from '../content/answerKey'
import { COPY, EXACT } from '../content/script'
import {
  classifyS1,
  classifyS2,
  evaluateP8,
  gradeDivergence,
  locateUnits,
  profileCodes,
  routeS3,
  S2_CONFIDENCE,
  type Handling,
} from './analysis'

const P = () => useProject.getState()
const S = () => useSession.getState()

export const CORE_PARTICIPANTS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const

/** Per-document progress for the case panel gates. */
export function docProgress() {
  const p = P()
  return p.docs
    .filter((d) => (CORE_PARTICIPANTS as readonly string[]).includes(d.participant))
    .map((d) => {
      const qs = p.quotations.filter((q) => q.docId === d.id)
      const coded = qs.filter((q) => p.codings.some((c) => c.quotationId === q.id && c.coder === p.currentUser))
      return { doc: d, segments: qs.length, coded: coded.length }
    })
}

export function snapshotCodebook(): CodebookEntry[] {
  const p = P()
  return p.codes
    .filter((c) => !c.suggested)
    .map((c) => ({
      codeId: c.id,
      label: c.name,
      type: c.type,
      colorHex: codeColour(c),
      excerptRefs: [...new Set(p.codings.filter((k) => k.codeId === c.id).map((k) => k.quotationId))],
    }))
}

/* ---------------------------- Phase A → B ---------------------------- */

export function finishSegmenting() {
  const p = P()
  const s = S()
  const r = classifyS1(p.docs, p.quotations, p.currentUser)
  s.patch({ branchState: { ...s.branchState, S1: r.state } })
  s.log('S1', `${r.state} — ${r.reason} (good ${r.counts.good}, partial ${r.counts.partial}, blended ${r.counts.blended}, fragment ${r.counts.fragment}; unit coverage ${Math.round(r.unitCoverage * 100)}%)`)

  // The S1 state hands Scene 2 a different starting codebook preview.
  if (r.state === 'strong') {
    p.addSuggestedCodes(SUGGESTIONS_STRONG)
    s.patch({ consequence: { tone: 'strong', ...COPY.s1.strong } })
  } else if (r.state === 'coarse') {
    p.addSuggestedCodes(SUGGESTIONS_COARSE)
    s.addFlag('blended')
    s.patch({ consequence: { tone: 'developing', ...COPY.s1.coarse } })
  } else {
    p.addSuggestedCodes(SUGGESTIONS_FRAGMENTED)
    s.addFlag('fragmented')
    s.patch({ consequence: { tone: 'weak', title: EXACT.signalLost, text: EXACT.fragmentedFeedback } })
  }
  s.patch({ gp1Phase: 'B' })
  if (!useUI.getState().focusMode) p.openTab({ kind: 'codeManager' }, 1)
}

/* ---------------------------- Phase B → C ---------------------------- */

export function finishCoding() {
  const p = P()
  const s = S()
  p.removeUnusedSuggested()
  const fresh = P()
  const r = classifyS2(fresh.docs, fresh.quotations, fresh.codes, fresh.codings, fresh.currentUser)
  const confidence = S2_CONFIDENCE[r.state]
  s.patch({
    branchState: { ...s.branchState, S2: r.state },
    meters: { ...s.meters, codebookConfidence: confidence },
    codebook: snapshotCodebook(),
    consequence: {
      tone: r.state === 'precise' ? 'strong' : r.state === 'overbroad' ? 'developing' : 'weak',
      ...COPY.s2[r.state],
    },
    gp1Phase: 'C',
  })
  if (r.state === 'overbroad') s.addFlag('overload')
  if (r.state === 'overfitted') s.addFlag('cannot-generalise')
  s.log(
    'S2',
    `${r.state} → confidence ${confidence}. ${r.reason} (${r.codesUsed} codes on ${r.codedQuotations} quotations; cross-participant ${Math.round(r.crossParticipantShare * 100)}%)`,
  )
  p.openTab({ kind: 'ica' }, 0)
}

/* ---------------------------- Phase C → route ---------------------------- */

/** Learner quotations overlapping the divergence's units; creates one on the unit if none exist. */
function quotationsFor(unitIds: string[]): Quotation[] {
  const p = P()
  const units = locateUnits(p.docs).filter((u) => unitIds.includes(u.id))
  const found = p.quotations.filter((q) => units.some((u) => q.docId === u.docId && q.start < u.end && q.end > u.start))
  if (found.length) return found
  return units.map((u) => p.createQuotation({ docId: u.docId, start: u.start, end: u.end }))
}

function learnerCodesOn(qs: Quotation[]) {
  const p = P()
  const ids = new Set(qs.map((q) => q.id))
  return [...new Set(p.codings.filter((c) => ids.has(c.quotationId) && c.coder === p.currentUser).map((c) => c.codeId))]
}

/** Carry out the chosen corrective action on the real codebook. */
function applyAction(participant: 'P2' | 'P4' | 'P5', actionId: string | null) {
  const d = DIVERGENCES.find((x) => x.participant === participant)!
  const action = d.actions.find((a) => a.id === actionId)
  if (!action || action.kind === 'keepMine') return
  const p = P()
  const qs = quotationsFor(d.unitIds)
  const mine = learnerCodesOn(qs)

  if (action.kind === 'adoptTheirs') {
    const c2 = p.createCode(d.coder2Code.name, d.coder2Code.type)
    for (const q of qs) {
      for (const id of mine) if (id !== c2.id) p.unlinkCode(q.id, id)
      p.applyCode(q.id, c2.id)
    }
    return
  }

  if (action.kind === 'precise') {
    const target = p.createCode(d.preciseCodeName, d.preciseCodeType)
    if (participant === 'P4') {
      // Merge every learner code that carries the same mechanism on P4 into the precise code.
      const fresh = P()
      const profiles = profileCodes(fresh.docs, fresh.quotations, fresh.codes, fresh.codings, fresh.currentUser)
      const overlapping = mine.filter((id) => id !== target.id && profiles.find((x) => x.codeId === id)?.mechanisms.includes('ILLEGIT'))
      for (const q of qs) P().applyCode(q.id, target.id)
      if (overlapping.length) P().mergeCodes(target.id, overlapping)
    } else {
      for (const q of qs) P().applyCode(q.id, target.id)
      if (participant === 'P5') {
        P().setCodeComment(
          target.id,
          'Applied alongside the stigma reading on P5: the location is both a practical barrier and a place where being seen matters. Reconciled with Coder 2 as legitimate interpretive variation.',
        )
      }
    }
    return
  }

  // 'other' actions: apply the alternative as stated, without merging
  const name = participant === 'P5' && action.id === 'blend' ? 'stigmatised location' : d.coder2Code.name
  const c = p.createCode(name, participant === 'P5' && action.id === 'blend' ? 'structural' : d.coder2Code.type)
  for (const q of qs) P().applyCode(q.id, c.id)
}

export function submitReconciliation() {
  const s = S()
  const grades = {
    P2: gradeDivergence('P2', s.recon.P2.cls, s.recon.P2.action),
    P4: gradeDivergence('P4', s.recon.P4.cls, s.recon.P4.action),
    P5: gradeDivergence('P5', s.recon.P5.cls, s.recon.P5.action),
  } as Record<'P2' | 'P4' | 'P5', Handling>
  const route = routeS3([grades.P2, grades.P4, grades.P5])
  for (const part of ['P2', 'P4', 'P5'] as const) {
    applyAction(part, s.recon[part].action)
    s.log('S3', `${part}: classified “${s.recon[part].cls}”, action “${s.recon[part].action}” → ${grades[part]}`)
  }
  s.patch({
    branchState: { ...s.branchState, S3_aggregate: grades, S3_route: route },
    codebook: snapshotCodebook(),
  })
  s.log('S3', `Route ${route}`)

  if (route === 'S3A') {
    openP8()
    S().patch({
      gp1Phase: 'S3A',
      unlockedContent: [...new Set([...S().unlockedContent, 'P8', 'S3A'])],
      consequence: { tone: 'bonus', title: 'Lead Researcher', text: EXACT.s3aMessage },
    })
  } else if (route === 'S3C') {
    S().addFlag('reliability-check-incomplete')
    S().patch({ gp1Phase: 'S3C', consequence: { tone: 'remedial', title: 'Lead Researcher', text: EXACT.s3cMessage } })
  } else {
    S().patch({ gp1Phase: 'done', consequence: { tone: 'neutral', ...COPY.s3b } })
  }
}

/* ---------------------------- S3A: P8 audit ---------------------------- */

function openP8() {
  const src = documents.find((d) => d.participant === 'P8')!
  const p = P()
  p.addDocument({
    id: 8,
    name: src.title,
    participant: 'P8',
    paragraphs: src.paragraphs,
    draft: src.draft,
    groups: [src.year, src.faculty],
  })
  S().patch({ p8: { status: 'open', codeIdsBefore: P().codes.map((c) => c.id) } })
  S().log('P8', 'P8 unlocked (Codebook Audit).')
  P().openTab({ kind: 'document', id: 8 }, 0)
}

export function finishP8() {
  const p = P()
  const s = S()
  const r = evaluateP8(p.docs, p.quotations, p.codes, p.codings, p.currentUser, s.p8.codeIdsBefore)
  s.log('P8', `${r.success ? 'success' : 'no boost'} — ${r.reason}`)
  if (r.success) {
    const next = Math.min(100, (s.meters.codebookConfidence ?? 0) + 10)
    s.addFlag('field-tested-codebook')
    s.patch({
      p8: { ...s.p8, status: 'success' },
      meters: { ...s.meters, codebookConfidence: next },
      gp1Phase: 'done',
      codebook: snapshotCodebook(),
      consequence: { tone: 'bonus', title: 'Field-Tested Codebook', text: EXACT.p8Feedback },
    })
  } else {
    // Bonus-then-recovery edge case: fold back into standard continuation, no penalty.
    s.patch({
      p8: { ...s.p8, status: 'fail' },
      gp1Phase: 'done',
      codebook: snapshotCodebook(),
      consequence: { tone: 'neutral', title: COPY.s3b.title, text: `${r.reason} ${COPY.p8.fail}` },
    })
  }
}

/* ---------------------------- S3C: coach ---------------------------- */

export function completeCoach() {
  const s = S()
  const before = s.meters.codebookConfidence ?? 0
  // +5, capped below what S3A/S3B would have achieved.
  const next = Math.min(before + 5, 74)
  s.clearFlag('reliability-check-incomplete')
  s.patch({
    meters: { ...s.meters, codebookConfidence: next },
    gp1Phase: 'done',
    consequence: { tone: 'remedial', title: 'Check-in complete', text: EXACT.s3cFeedback },
  })
  s.log('S3C', `Coach check-in complete: confidence ${before} → ${next}; reliability flag cleared.`)
}

/* ---------------------------- keyboard segmentation ---------------------------- */

/** Word boundaries of one paragraph, as document offsets, for start/end controls. */
export function paragraphWords(docId: number, paragraphIndex: number) {
  const doc = P().docs.find((d) => d.id === docId)
  if (!doc) return []
  const start = doc.paragraphs.slice(0, paragraphIndex).reduce((n, para) => n + para.length + 1, 0)
  const text = doc.paragraphs[paragraphIndex] ?? ''
  const out: { word: string; start: number; end: number }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push({ word: m[0], start: start + m.index, end: start + m.index + m[0].length })
  return out
}

export const quotationText = (q: Quotation) => {
  const d = P().docs.find((x) => x.id === q.docId)
  return d ? getDocText(d).slice(q.start, q.end) : ''
}
