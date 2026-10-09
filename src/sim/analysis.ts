/**
 * Deterministic branch rules for Gameplay 1 (storyboard §10.2).
 * Pure functions over the ATLAS.ti project data so they can be unit-tested.
 */
import {
  ALLOWED_CATEGORY_PAIRS,
  ALTERNATIVE_READINGS,
  CANDIDATE_THEMES,
  COMPATIBLE,
  DIVERGENCES,
  MECHANISMS,
  REFERENCE_UNITS,
  refCategoryOf,
  type DivergenceClass,
  type Mechanism,
  type P7Outcome,
  type RefCategory,
  type ReferenceUnit,
} from '../content/answerKey'
import type { Code, CodeGroup, Coding, Doc, Network, Quotation } from '../store/project'

export type S1 = 'strong' | 'coarse' | 'fragmented'
export type S2 = 'precise' | 'overbroad' | 'overfitted'
export type Handling = 'well' | 'partial' | 'poor'
export type S3Route = 'S3A' | 'S3B' | 'S3C'

export interface LocatedUnit extends ReferenceUnit {
  docId: number
  start: number
  end: number
}

const docText = (d: Doc) => d.paragraphs.join('\n')

/** Resolve reference units to character offsets in the project's documents. */
export function locateUnits(docs: Doc[]): LocatedUnit[] {
  const out: LocatedUnit[] = []
  for (const unit of REFERENCE_UNITS) {
    const doc = docs.find((d) => d.participant === unit.participant)
    if (!doc) continue
    const start = docText(doc).indexOf(unit.text)
    if (start < 0) continue
    out.push({ ...unit, docId: doc.id, start, end: start + unit.text.length })
  }
  return out
}

/* ------------------------------ S1 ------------------------------ */

export type SegmentKind = 'good' | 'blended' | 'fragment' | 'partial' | 'off'

export interface SegmentReading {
  quotationId: string
  kind: SegmentKind
  /** Units the quotation substantially covers (or best overlaps, for fragments/partials). */
  unitIds: string[]
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export function readSegment(q: Quotation, docs: Doc[], units: LocatedUnit[]): SegmentReading {
  const doc = docs.find((d) => d.id === q.docId)
  const text = doc ? docText(doc).slice(q.start, q.end) : ''
  const qLen = Math.max(1, q.end - q.start)
  const scored = units
    .filter((u) => u.docId === q.docId)
    .map((u) => {
      const overlap = Math.max(0, Math.min(q.end, u.end) - Math.max(q.start, u.start))
      return { u, overlap, covU: overlap / (u.end - u.start), covQ: overlap / qLen }
    })
    .filter((s) => s.overlap > 0)
  if (!scored.length) return { quotationId: q.id, kind: 'off', unitIds: [] }

  const majority = scored.filter((s) => s.covU >= 0.5)
  if (majority.length >= 2) return { quotationId: q.id, kind: 'blended', unitIds: majority.map((s) => s.u.id) }
  const best = scored.sort((a, b) => b.overlap - a.overlap)[0]
  if (best.covU >= 0.5 && best.covQ >= 0.6) return { quotationId: q.id, kind: 'good', unitIds: [best.u.id] }
  if (best.covU < 0.5 && words(text) <= 6) return { quotationId: q.id, kind: 'fragment', unitIds: [best.u.id] }
  return { quotationId: q.id, kind: 'partial', unitIds: [best.u.id] }
}

export interface S1Result {
  state: S1
  readings: SegmentReading[]
  counts: Record<SegmentKind, number>
  unitCoverage: number
  reason: string
}

/** P1–P6 only; the learner's own quotations. */
export function classifyS1(docs: Doc[], quotations: Quotation[], learner: string): S1Result {
  const units = locateUnits(docs).filter((u) => u.participant !== 'P8')
  const coreDocIds = new Set(docs.filter((d) => ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(d.participant)).map((d) => d.id))
  const qs = quotations.filter((q) => coreDocIds.has(q.docId) && q.createdBy === learner)
  const readings = qs.map((q) => readSegment(q, docs, units))
  const counts: Record<SegmentKind, number> = { good: 0, blended: 0, fragment: 0, partial: 0, off: 0 }
  for (const r of readings) counts[r.kind]++
  const n = readings.length - counts.off
  const covered = new Set(readings.filter((r) => r.kind === 'good' || r.kind === 'partial').flatMap((r) => r.unitIds))
  const unitCoverage = units.length ? covered.size / units.length : 0

  let state: S1 = 'strong'
  let reason = 'Segments carry one complete idea each.'
  const fragmented = counts.fragment >= 6 && counts.fragment / Math.max(1, n) >= 0.4
  const blended = counts.blended / Math.max(1, n) >= 0.3
  if (fragmented && (!blended || counts.fragment >= counts.blended)) {
    state = 'fragmented'
    reason = 'Many segments are single words or short fragments with no complete unit of meaning.'
  } else if (blended) {
    state = 'coarse'
    reason = 'Many segments blend more than one idea — typically a stated attitude with a behaviour.'
  } else if (n === 0 || unitCoverage < 0.4) {
    state = 'coarse'
    reason = 'Large stretches of the transcripts were left unsegmented, so distinct ideas stay blended together.'
  }
  return { state, readings, counts, unitCoverage, reason }
}

/* ------------------------------ S2 ------------------------------ */

function cluster(m: Mechanism): string {
  const pair = COMPATIBLE.find((p) => p.includes(m))
  return pair ? pair.join('+') : m
}

export interface CodeProfile {
  codeId: string
  name: string
  quotations: number
  docs: number
  mechanisms: Mechanism[]
  clusters: number
}

export interface S2Result {
  state: S2
  profiles: CodeProfile[]
  codesUsed: number
  codedQuotations: number
  overbroadCodeIds: string[]
  overbroadShare: number
  crossParticipantShare: number
  singleUseShare: number
  reason: string
}

/** Mechanisms a code carries, given which units its quotations land on. */
export function profileCodes(
  docs: Doc[],
  quotations: Quotation[],
  codes: Code[],
  codings: Coding[],
  learner: string,
  docFilter?: (d: Doc) => boolean,
): CodeProfile[] {
  const units = locateUnits(docs)
  const unitById = new Map(units.map((u) => [u.id, u]))
  const allowed = new Set(docs.filter((d) => (docFilter ? docFilter(d) : true)).map((d) => d.id))
  const mine = codings.filter((c) => c.coder === learner)
  return codes
    .map((code) => {
      const qids = [...new Set(mine.filter((c) => c.codeId === code.id).map((c) => c.quotationId))]
      const qs = qids.map((id) => quotations.find((q) => q.id === id)).filter((q): q is Quotation => !!q && allowed.has(q.docId))
      const mechs = new Set<Mechanism>()
      for (const q of qs) {
        const reading = readSegment(q, docs, units)
        const onQ = new Set(mine.filter((c) => c.quotationId === q.id).map((c) => c.codeId)).size
        // A blended segment carrying one code per idea has been split by coding: don't charge it to every code.
        if (reading.unitIds.length >= 2 && onQ >= reading.unitIds.length) continue
        for (const uid of reading.unitIds) {
          const unit = unitById.get(uid)!
          if (unit.alt && (mechs.has(unit.alt) || [...mechs].some((m) => cluster(m) === cluster(unit.alt!)))) mechs.add(unit.alt)
          else mechs.add(unit.mechanism)
        }
      }
      const clusters = new Set([...mechs].map(cluster)).size
      return {
        codeId: code.id,
        name: code.name,
        quotations: qs.length,
        docs: new Set(qs.map((q) => q.docId)).size,
        mechanisms: [...mechs],
        clusters,
      }
    })
    .filter((p) => p.quotations > 0)
}

export function classifyS2(docs: Doc[], quotations: Quotation[], codes: Code[], codings: Coding[], learner: string): S2Result {
  const core = (d: Doc) => ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(d.participant)
  const profiles = profileCodes(docs, quotations, codes, codings, learner, core)
  const coreIds = new Set(docs.filter(core).map((d) => d.id))
  const coded = new Set(
    codings
      .filter((c) => c.coder === learner)
      .map((c) => c.quotationId)
      .filter((id) => {
        const q = quotations.find((x) => x.id === id)
        return q && coreIds.has(q.docId)
      }),
  )
  const codesUsed = profiles.length
  const overbroad = profiles.filter((p) => p.clusters >= 3)
  const overbroadIds = new Set(overbroad.map((p) => p.codeId))
  const overbroadQuotes = new Set(
    codings.filter((c) => c.coder === learner && overbroadIds.has(c.codeId) && coded.has(c.quotationId)).map((c) => c.quotationId),
  )
  const overbroadShare = coded.size ? overbroadQuotes.size / coded.size : 0
  const crossParticipantShare = codesUsed ? profiles.filter((p) => p.docs >= 2).length / codesUsed : 0
  const singleUseShare = codesUsed ? profiles.filter((p) => p.quotations === 1).length / codesUsed : 0

  let state: S2 = 'precise'
  let reason = 'Codes name distinct mechanisms and are reused across participants.'
  if (overbroad.length && (overbroadShare >= 0.4 || codesUsed <= 3)) {
    state = 'overbroad'
    reason = `“${overbroad[0].name}” absorbs structurally different experiences.`
  } else if (codesUsed >= 4 && (crossParticipantShare === 0 || (crossParticipantShare < 0.25 && singleUseShare >= 0.6))) {
    state = 'overfitted'
    reason = 'Almost every code fits a single excerpt; few apply across participants.'
  }
  return {
    state,
    profiles,
    codesUsed,
    codedQuotations: coded.size,
    overbroadCodeIds: [...overbroadIds],
    overbroadShare,
    crossParticipantShare,
    singleUseShare,
    reason,
  }
}

export const S2_CONFIDENCE: Record<S2, number> = { precise: 82, overbroad: 45, overfitted: 35 }

/* ------------------------------ S3 ------------------------------ */

export function gradeDivergence(participant: 'P2' | 'P4' | 'P5', cls: DivergenceClass | null, actionId: string | null): Handling {
  const d = DIVERGENCES.find((x) => x.participant === participant)!
  const action = d.actions.find((a) => a.id === actionId)
  const classOk = !!cls && d.correct.includes(cls)
  const classDefensible = !!cls && d.defensible.includes(cls)
  const precise = action?.kind === 'precise'
  const winnerPick = action?.kind === 'keepMine' || action?.kind === 'adoptTheirs'
  if (classOk && precise) return 'well'
  if (winnerPick && !classOk) return 'poor'
  if (precise || classOk || classDefensible) return 'partial'
  return 'poor'
}

export function routeS3(grades: Handling[]): S3Route {
  const well = grades.filter((g) => g === 'well').length
  if (well === 3) return 'S3A'
  if (well === 0) return 'S3C'
  return 'S3B'
}

/* ------------------------------ P8 ------------------------------ */

export interface P8Result {
  success: boolean
  inventedCode: boolean
  coded: boolean
  reason: string
}

/**
 * P8 succeeds when it is coded with the existing codebook — no code created
 * after P8 opened — and at least one applied code already carries the
 * illegitimacy-of-need mechanism from P1–P6.
 */
export function evaluateP8(
  docs: Doc[],
  quotations: Quotation[],
  codes: Code[],
  codings: Coding[],
  learner: string,
  codeIdsBeforeP8: string[],
): P8Result {
  const p8 = docs.find((d) => d.participant === 'P8')
  if (!p8) return { success: false, inventedCode: false, coded: false, reason: 'P8 is not in the project.' }
  const p8Q = new Set(quotations.filter((q) => q.docId === p8.id).map((q) => q.id))
  const applied = [...new Set(codings.filter((c) => c.coder === learner && p8Q.has(c.quotationId)).map((c) => c.codeId))]
  const before = new Set(codeIdsBeforeP8)
  const inventedCode = applied.some((id) => !before.has(id)) || codes.some((c) => !before.has(c.id) && !c.suggested)
  const core = (d: Doc) => ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(d.participant)
  const profiles = profileCodes(docs, quotations, codes, codings, learner, core)
  const carriesIllegit = applied.some((id) => profiles.find((p) => p.codeId === id)?.mechanisms.includes('ILLEGIT'))
  if (!applied.length) return { success: false, inventedCode, coded: false, reason: 'P8 was not coded.' }
  if (inventedCode) return { success: false, inventedCode, coded: true, reason: 'A new code was created for P8.' }
  if (!carriesIllegit)
    return { success: false, inventedCode, coded: true, reason: 'The codes applied don’t capture P8’s doubt about whether their need is real.' }
  return { success: true, inventedCode, coded: true, reason: 'P8 coded with the existing codebook.' }
}

export const mechanismLabel = (m: Mechanism) => MECHANISMS[m].label

/* ============================== GAMEPLAY 2 ============================== */

export type S4Logic = 'mechanism' | 'outcome'
export type CountRisk = 'none' | 'overgeneralised' | 'fragmented'
export type S4State = 'S4-Mechanism' | 'S4-Outcome' | 'S4-Miscount'

/** Count rule: 2 → over-generalisation; 3–4 → preferred; 5–6 → fragmentation. Never blocks. */
export function countRisk(count: number): CountRisk {
  if (count <= 2) return 'overgeneralised'
  if (count >= 5) return 'fragmented'
  return 'none'
}

/** Dominant reference category of a code, from the units its quotations land on (P1–P8). */
export function codeRefCategories(docs: Doc[], quotations: Quotation[], codes: Code[], codings: Coding[], learner: string) {
  const units = locateUnits(docs)
  const unitById = new Map(units.map((u) => [u.id, u]))
  const out = new Map<string, RefCategory | null>()
  for (const code of codes) {
    const tally = new Map<RefCategory, number>()
    const qids = new Set(codings.filter((c) => c.codeId === code.id && c.coder === learner).map((c) => c.quotationId))
    for (const qid of qids) {
      const q = quotations.find((x) => x.id === qid)
      if (!q) continue
      for (const uid of readSegment(q, docs, units).unitIds) {
        const rc = refCategoryOf(unitById.get(uid)!.mechanism)
        tally.set(rc, (tally.get(rc) ?? 0) + 1)
      }
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
    out.set(code.id, best ? best[0] : null)
  }
  return out
}

const pairAllowed = (a: RefCategory, b: RefCategory) =>
  ALLOWED_CATEGORY_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

/** Live container coherence (0–1) used for the container border colour. */
export function groupCoherence(memberIds: string[], refs: Map<string, RefCategory | null>) {
  const cats = memberIds.map((id) => refs.get(id)).filter((x): x is RefCategory => !!x)
  if (!cats.length) return { score: 0, coherent: false }
  const counts = new Map<RefCategory, number>()
  for (const c of cats) counts.set(c, (counts.get(c) ?? 0) + 1)
  // with four or more codes, one stray code doesn't break a container
  let kinds = [...counts.keys()]
  if (cats.length >= 4) kinds = kinds.filter((k) => counts.get(k)! > 1 || kinds.length === 1)
  if (kinds.length === 1) return { score: 0.9, coherent: true }
  if (kinds.length === 2 && pairAllowed(kinds[0], kinds[1])) return { score: 0.78, coherent: true }
  const purity = Math.max(...counts.values()) / cats.length
  return { score: Math.min(purity, 0.7), coherent: false }
}

export interface S4Result {
  state: S4State
  logic: S4Logic
  countRisk: CountRisk
  coherence: number
  mechanismShare: number
  groupScores: { id: string; score: number; coherent: boolean }[]
  reason: string
}

/**
 * S4 (§10.2): mechanism + 3/4 → 85; outcome + 3/4 → 55; out-of-range + outcome → 35 with stacked flags.
 * Build-resolution default (not specified in the source): mechanism + out-of-range → 55.
 */
export function classifyS4(
  count: number,
  groups: CodeGroup[],
  docs: Doc[],
  quotations: Quotation[],
  codes: Code[],
  codings: Coding[],
  learner: string,
): S4Result {
  const refs = codeRefCategories(docs, quotations, codes, codings, learner)
  const groupScores = groups.map((g) => ({ id: g.id, ...groupCoherence(g.memberCodeIds, refs) }))
  const total = groups.reduce((n, g) => n + g.memberCodeIds.length, 0)
  const inCoherent = groups.reduce((n, g, i) => n + (groupScores[i].coherent ? g.memberCodeIds.length : 0), 0)
  const mechanismShare = total ? inCoherent / total : 0
  const logic: S4Logic = mechanismShare >= 0.75 ? 'mechanism' : 'outcome'
  const risk = countRisk(count)
  let state: S4State
  let coherence: number
  if (risk === 'none') {
    state = logic === 'mechanism' ? 'S4-Mechanism' : 'S4-Outcome'
    coherence = logic === 'mechanism' ? 85 : 55
  } else {
    state = 'S4-Miscount'
    coherence = logic === 'outcome' ? 35 : 55
  }
  const reason =
    logic === 'mechanism'
      ? 'Categories group codes by a shared underlying mechanism.'
      : 'Categories group codes by a shared surface outcome rather than the mechanism behind it.'
  return { state, logic, countRisk: risk, coherence, mechanismShare, groupScores, reason }
}

export const S5_INTEGRITY: Record<P7Outcome, number> = { integrated: 90, narrowed: 60, dismissed: 35 }

/**
 * S5 (§10.2). Integration requires the correct theme to be ranked top; integrating
 * P7 into a misranked theme records the over-corrected tier (build-resolution default).
 */
export function resolveS5(topThemeId: string, step1: string | null, step2: string | null): { outcome: P7Outcome; misranked: boolean } {
  const misranked = !CANDIDATE_THEMES.find((t) => t.id === topThemeId)?.correct
  if (step1 !== 'boundary') return { outcome: 'dismissed', misranked }
  const outcome: P7Outcome = step2 === 'integrate' ? 'integrated' : 'narrowed'
  return { outcome: misranked && outcome === 'integrated' ? 'narrowed' : outcome, misranked }
}

/* ============================== GAMEPLAY 3 ============================== */

export type Tier = 'green' | 'amber' | 'red'

export interface LegacyNodes {
  S1?: S1
  S2?: S2
  S3_route?: S3Route
  S4?: S4State
  S5?: P7Outcome
}

export function legacyTiers(b: LegacyNodes): Tier[] {
  const t = (v: string | undefined, g: string, a: string): Tier => (v === g ? 'green' : v === a ? 'amber' : 'red')
  return [
    t(b.S1, 'strong', 'coarse'),
    t(b.S2, 'precise', 'overbroad'),
    t(b.S3_route, 'S3A', 'S3B'),
    t(b.S4, 'S4-Mechanism', 'S4-Outcome'),
    t(b.S5, 'integrated', 'narrowed'),
  ]
}

export function trajectory(b: LegacyNodes): 'green' | 'mixed' | 'weak' {
  const tiers = legacyTiers(b)
  if (tiers.filter((x) => x === 'green').length >= 3) return 'green'
  if (tiers.filter((x) => x === 'red').length >= 3) return 'weak'
  return 'mixed'
}

export interface JigsawCheck {
  completeness: number
  fullyLinked: boolean
  missing: string[]
}

/**
 * Jigsaw: every category linked to the theme; every category backed by at least
 * one quotation coded with one of its codes; a P7 quotation linked to the theme.
 */
export function checkJigsaw(net: Network | undefined, groups: CodeGroup[], quotations: Quotation[], codings: Coding[], docs: Doc[]): JigsawCheck {
  const missing: string[] = []
  let have = 0
  let need = 0
  const theme = 'theme:THEME'
  const links = net?.links ?? []
  const linked = (a: string, b: string) => links.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a))
  for (const g of groups) {
    const gid = `codeGroup:${g.id}`
    need++
    if (linked(gid, theme)) have++
    else missing.push(`“${g.name}” is not linked to the theme`)
    need++
    const evidence = links.some((l) => {
      const other = l.from === gid ? l.to : l.to === gid ? l.from : null
      if (!other?.startsWith('quotation:')) return false
      const qid = other.slice('quotation:'.length)
      return codings.some((c) => c.quotationId === qid && g.memberCodeIds.includes(c.codeId))
    })
    if (evidence) have++
    else missing.push(`“${g.name}” has no supporting quotation linked`)
  }
  need++
  const p7 = docs.find((d) => d.participant === 'P7')
  const p7Linked = links.some((l) => {
    const other = l.from === theme ? l.to : l.to === theme ? l.from : null
    if (!other?.startsWith('quotation:')) return false
    const q = quotations.find((x) => x.id === other.slice('quotation:'.length))
    return !!q && q.docId === p7?.id
  })
  if (p7Linked) have++
  else missing.push('The negative case (a P7 quotation) is not linked to the theme')
  const completeness = need ? have / need : 0
  return { completeness, fullyLinked: need > 0 && have === need, missing }
}

export const namesP4andP7 = (text: string) => /\bP4\b/i.test(text) && /\bP7\b/i.test(text)

export function peerReviewGate(b: LegacyNodes, jigsaw: JigsawCheck, memoText: string) {
  const majorityGreen = legacyTiers(b).filter((t) => t === 'green').length >= 3
  const memoOk = namesP4andP7(memoText)
  return { unlocked: majorityGreen && jigsaw.fullyLinked && memoOk, majorityGreen, jigsaw: jigsaw.fullyLinked, memoOk }
}

/** Exact peer challenge template (storyboard §10.4). */
export const CHALLENGE_TEMPLATE =
  'You\'re treating {evidence_ref} as evidence of {theme_claim}. Couldn’t it just as easily be {alternative_reading}? What in the data rules that out?'

export function evidenceRef(q: Quotation, docs: Doc[]) {
  const d = docs.find((x) => x.id === q.docId)
  const words = docText(d!).slice(q.start, q.end).replace(/\s+/g, ' ').trim().split(' ')
  const snippet = words.slice(0, 9).join(' ') + (words.length > 9 ? '…' : '')
  return `${d?.participant ?? 'the participant'}'s comment “${snippet}”`
}

function seeded(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h >>>= 0) % 10000) / 10000
  }
}

export interface Challenge {
  id: string
  quotationId: string
  participant: string
  evidenceRef: string
  themeClaim: string
  alternative: string
  text: string
}

/** Three challenges bound to the learner's memo evidence and jigsaw evidence, filled from the alternative-reading bank. */
export function generateChallenges(
  strongestQuotationId: string | null,
  evidenceQuotationIds: string[],
  themeClaim: string,
  quotations: Quotation[],
  docs: Doc[],
  seed: string,
): Challenge[] {
  const rnd = seeded(seed)
  const pool = [strongestQuotationId, ...evidenceQuotationIds].filter((x): x is string => !!x)
  const picked: Quotation[] = []
  const usedParticipants = new Set<string>()
  for (const id of pool) {
    const q = quotations.find((x) => x.id === id)
    const part = q && docs.find((d) => d.id === q.docId)?.participant
    if (!q || !part || !(part in ALTERNATIVE_READINGS) || usedParticipants.has(part)) continue
    picked.push(q)
    usedParticipants.add(part)
    if (picked.length === 3) break
  }
  // fall back to repeating evidence if fewer than three participants were linked
  for (const id of pool) {
    if (picked.length >= 3) break
    const q = quotations.find((x) => x.id === id)
    if (q && !picked.includes(q) && docs.find((d) => d.id === q.docId)?.participant! in ALTERNATIVE_READINGS) picked.push(q)
  }
  return picked.map((q, i) => {
    const participant = docs.find((d) => d.id === q.docId)!.participant as keyof typeof ALTERNATIVE_READINGS
    const bank = ALTERNATIVE_READINGS[participant]
    const alternative = bank[Math.floor(rnd() * bank.length)]
    const ref = evidenceRef(q, docs)
    return {
      id: `CH${i + 1}`,
      quotationId: q.id,
      participant,
      evidenceRef: ref,
      themeClaim,
      alternative,
      text: CHALLENGE_TEMPLATE.replace('{evidence_ref}', ref).replace('{theme_claim}', themeClaim).replace('{alternative_reading}', alternative),
    }
  })
}

export type Posture = 'defend' | 'qualify' | 'revise'
export type ResponseQuality = 'engaged' | 'capitulated' | 'dismissed' | 'thin'

/** Evidence-led responses are "engaged" whatever the posture; reflexive ones are named for what they did. */
export function rateResponse(evidenceQuotationId: string | null, posture: Posture | null, rationale: string): ResponseQuality {
  const words = rationale.trim().split(/\s+/).filter(Boolean).length
  if (evidenceQuotationId && posture && words >= 8) return 'engaged'
  if (posture === 'revise') return 'capitulated'
  if (posture === 'defend') return 'dismissed'
  return 'thin'
}

/* ============================== ENDING ============================== */

export type Level = 'Strong' | 'Developing' | 'Emerging'
const tierValue: Record<Tier, number> = { green: 1, amber: 0.5, red: 0 }
const toLevel = (v: number): Level => (v >= 0.75 ? 'Strong' : v >= 0.4 ? 'Developing' : 'Emerging')

export interface CompetencyRow {
  name: string
  level?: Level
  inputs: string
  evidence: string[]
}

/**
 * Normalised competency profile. Only the five competencies the source binds are
 * levelled; bonus content (S3A, S6.5) and optional field notes add evidence, never ceiling.
 */
export function competencyProfile(
  b: LegacyNodes,
  jigsawCompleteness: number,
  fieldNotesUsed: boolean,
  responses: ResponseQuality[],
  extras: { memoNamesP4P7: boolean; codebookSize: number; reflections: number },
): CompetencyRow[] {
  const [t1, t2, t3, t4, t5] = legacyTiers(b)
  const jig: Tier = jigsawCompleteness >= 1 ? 'green' : jigsawCompleteness >= 0.6 ? 'amber' : 'red'
  const engaged = responses.filter((r) => r === 'engaged').length
  return [
    { name: 'Coding Precision', level: toLevel((tierValue[t1] + tierValue[t2]) / 2), inputs: 'Segmentation (S1) + first-pass coding (S2)', evidence: [`S1 ${b.S1}`, `S2 ${b.S2}`] },
    { name: 'Analytical Consistency', inputs: 'Recorded qualitatively', evidence: [`${extras.codebookSize} codes carried from codebook to categories`] },
    { name: 'Category Development', level: toLevel(tierValue[t4]), inputs: 'Category count + grouping logic (S4)', evidence: [`${b.S4}`] },
    { name: 'Theme Quality', level: toLevel(tierValue[t5]), inputs: 'Negative-case handling (S5)', evidence: [`P7 ${b.S5}`] },
    { name: 'Evidence Use', inputs: 'Recorded qualitatively', evidence: [`Jigsaw ${Math.round(jigsawCompleteness * 100)}% linked`] },
    {
      name: 'Recognition of Contradictions',
      level: toLevel(tierValue[t5]),
      inputs: 'S5 + optional field notes + peer-review responses (depth only)',
      evidence: [`P7 ${b.S5}`, fieldNotesUsed ? 'Field notes linked to the theme' : 'Field notes not linked', ...(responses.length ? [`${engaged}/${responses.length} challenges answered with evidence`] : [])],
    },
    { name: 'Reflexivity', inputs: 'Recorded qualitatively', evidence: [`${extras.reflections} reflection prompt(s) answered`] },
    { name: 'Analytical Reasoning', inputs: 'Recorded qualitatively', evidence: [`Reconciliation route ${b.S3_route}`] },
    { name: 'Interpretive Depth', inputs: 'Recorded qualitatively', evidence: [extras.memoNamesP4P7 ? 'Memo traces P4 reconciliation and P7 handling' : 'Memo does not name both P4 and P7'] },
    {
      name: 'Transparency of Decision-Making',
      level: toLevel((tierValue[t3] + tierValue[jig]) / 2),
      inputs: 'Reconciliation handling (S3) + jigsaw completeness',
      evidence: [`${b.S3_route}`, `Jigsaw ${Math.round(jigsawCompleteness * 100)}%`],
    },
  ]
}
