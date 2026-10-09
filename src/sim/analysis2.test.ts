import { describe, expect, it } from 'vitest'
import { documents } from '../content/draftDataset'
import { REF_CATEGORIES, refCategoryOf, type Mechanism } from '../content/answerKey'
import type { Code, CodeGroup, Coding, Doc, Network, Quotation } from '../store/project'
import {
  CHALLENGE_TEMPLATE,
  checkJigsaw,
  classifyS4,
  competencyProfile,
  countRisk,
  generateChallenges,
  locateUnits,
  peerReviewGate,
  rateResponse,
  resolveS5,
  trajectory,
} from './analysis'

const ME = 'Learner'

function world() {
  const docs: Doc[] = documents
    .filter((d) => d.gated !== 'P8')
    .map((d) => ({ id: Number(d.participant.slice(1)), name: d.title, participant: d.participant, paragraphs: d.paragraphs, draft: true, groups: [] }))
  const units = locateUnits(docs)
  const quotations: Quotation[] = []
  const codes: Code[] = []
  const codings: Coding[] = []
  // one quotation per unit (P1–P6), coded by mechanism
  for (const u of units.filter((x) => x.participant !== 'P7' && x.participant !== 'P8')) {
    const q: Quotation = { id: `${u.docId}:${quotations.filter((x) => x.docId === u.docId).length + 1}`, docId: u.docId, index: 0, start: u.start, end: u.end, createdBy: ME, created: 0 }
    quotations.push(q)
    let c = codes.find((x) => x.name === u.mechanism)
    if (!c) {
      c = { id: `c-${u.mechanism}`, name: u.mechanism, createdBy: ME, created: 0 }
      codes.push(c)
    }
    codings.push({ quotationId: q.id, codeId: c.id, coder: ME })
  }
  const p7 = docs.find((d) => d.participant === 'P7')!
  const p7q: Quotation = { id: '7:1', docId: p7.id, index: 1, start: 0, end: 40, createdBy: ME, created: 0 }
  quotations.push(p7q)
  return { docs, quotations, codes, codings }
}

const byRef = (w: ReturnType<typeof world>) => {
  const groups: CodeGroup[] = (Object.keys(REF_CATEGORIES) as (keyof typeof REF_CATEGORIES)[]).map((k) => ({
    id: k,
    name: REF_CATEGORIES[k].label,
    memberCodeIds: w.codes.filter((c) => refCategoryOf(c.name as Mechanism) === k).map((c) => c.id),
  }))
  return groups
}

describe('S4 categories', () => {
  it('count warnings: 2 over-generalised, 3–4 none, 5–6 fragmented (never blocking)', () => {
    expect([2, 3, 4, 5, 6].map(countRisk)).toEqual(['overgeneralised', 'none', 'none', 'fragmented', 'fragmented'])
  })

  it('mechanism grouping with 4 categories → S4-Mechanism, coherence 85', () => {
    const w = world()
    const r = classifyS4(4, byRef(w), w.docs, w.quotations, w.codes, w.codings, ME)
    expect(r.state).toBe('S4-Mechanism')
    expect(r.coherence).toBe(85)
  })

  it('outcome bins with 3 categories → S4-Outcome, vague, coherence 55', () => {
    const w = world()
    const id = (m: string) => `c-${m}`
    const groups: CodeGroup[] = [
      { id: 'a', name: 'Reasons for not going', memberCodeIds: [id('ILLEGIT'), id('ACCESS'), id('STIGMA'), id('NONENGAGE')] },
      { id: 'b', name: 'Feelings', memberCodeIds: [id('DISTRESS'), id('ENDORSE'), id('SELFRELIANCE')] },
      { id: 'c', name: 'Other', memberCodeIds: [id('CRITIQUE'), id('ENCOUNTER'), id('PUBLICPRIVATE')] },
    ]
    const r = classifyS4(3, groups, w.docs, w.quotations, w.codes, w.codings, ME)
    expect(r.logic).toBe('outcome')
    expect(r.state).toBe('S4-Outcome')
    expect(r.coherence).toBe(55)
  })

  it('out-of-range count with outcome grouping → S4-Miscount, flags stack, coherence 35', () => {
    const w = world()
    const all = w.codes.map((c) => c.id)
    const groups: CodeGroup[] = [
      { id: 'a', name: 'Not going', memberCodeIds: all.slice(0, 5) },
      { id: 'b', name: 'Going', memberCodeIds: all.slice(5) },
    ]
    const r = classifyS4(2, groups, w.docs, w.quotations, w.codes, w.codings, ME)
    expect(r.state).toBe('S4-Miscount')
    expect(r.countRisk).toBe('overgeneralised')
    expect(r.coherence).toBe(35)
  })
})

describe('S5 negative case', () => {
  it('integrated / narrowed / dismissed are three distinct saved states', () => {
    expect(resolveS5('T-ENTITLE', 'boundary', 'integrate').outcome).toBe('integrated')
    expect(resolveS5('T-ENTITLE', 'boundary', 'narrow').outcome).toBe('narrowed')
    expect(resolveS5('T-ENTITLE', 'outlier', null).outcome).toBe('dismissed')
  })
  it('a misranked top theme cannot reach integrated', () => {
    const r = resolveS5('T-STIGMA', 'boundary', 'integrate')
    expect(r).toEqual({ outcome: 'narrowed', misranked: true })
  })
})

describe('Peer-review gate (S6.5)', () => {
  const green = { S1: 'strong', S2: 'precise', S3_route: 'S3A', S4: 'S4-Mechanism', S5: 'integrated' } as const
  const fullJigsaw = { completeness: 1, fullyLinked: true, missing: [] }
  it('unlocks only when all three conditions hold', () => {
    expect(peerReviewGate(green, fullJigsaw, 'P4 merge … P7 marked the edge').unlocked).toBe(true)
    expect(peerReviewGate(green, fullJigsaw, 'P7 only').unlocked).toBe(false)
    expect(peerReviewGate(green, { ...fullJigsaw, fullyLinked: false }, 'P4 and P7').unlocked).toBe(false)
    expect(peerReviewGate({ ...green, S1: 'fragmented', S2: 'overfitted', S3_route: 'S3C' }, fullJigsaw, 'P4 and P7').unlocked).toBe(false)
  })
  it('trajectory: green / mixed / weak', () => {
    expect(trajectory(green)).toBe('green')
    expect(trajectory({ S1: 'coarse', S2: 'overbroad', S3_route: 'S3B', S4: 'S4-Outcome', S5: 'narrowed' })).toBe('mixed')
    expect(trajectory({ S1: 'fragmented', S2: 'overfitted', S3_route: 'S3C', S4: 'S4-Miscount', S5: 'dismissed' })).toBe('weak')
  })
})

describe('Jigsaw', () => {
  it('reports missing links and full linkage', () => {
    const w = world()
    const groups = byRef(w)
    const net: Network = { id: 'N', name: 'map', nodes: [], links: [] }
    let r = checkJigsaw(net, groups, w.quotations, w.codings, w.docs)
    expect(r.fullyLinked).toBe(false)
    expect(r.missing.length).toBe(groups.length * 2 + 1)
    for (const g of groups) {
      net.links.push({ id: `l-${g.id}`, from: `codeGroup:${g.id}`, to: 'theme:THEME', relation: 'is part of' })
      const q = w.codings.find((c) => g.memberCodeIds.includes(c.codeId))!.quotationId
      net.links.push({ id: `e-${g.id}`, from: `quotation:${q}`, to: `codeGroup:${g.id}`, relation: 'supports' })
    }
    net.links.push({ id: 'p7', from: 'quotation:7:1', to: 'theme:THEME', relation: 'contradicts' })
    r = checkJigsaw(net, groups, w.quotations, w.codings, w.docs)
    expect(r.fullyLinked).toBe(true)
    expect(r.completeness).toBe(1)
  })
})

describe('Challenge generation', () => {
  it('binds the exact template to the learner’s evidence and theme', () => {
    const w = world()
    const ch = generateChallenges('2:1', ['4:3', '5:2', '7:1'], 'a belief that support is for other people', w.quotations, w.docs, 'seed')
    expect(ch).toHaveLength(3)
    expect(new Set(ch.map((c) => c.participant)).size).toBe(3)
    for (const c of ch) {
      const [pre] = CHALLENGE_TEMPLATE.split('{evidence_ref}')
      expect(c.text.startsWith(pre)).toBe(true)
      expect(c.text).toContain(c.evidenceRef)
      expect(c.text).toContain('as evidence of a belief that support is for other people.')
      expect(c.text).toContain(c.alternative)
      expect(c.text.endsWith('What in the data rules that out?')).toBe(true)
      expect(c.text).not.toMatch(/[{}]/)
    }
    expect(ch[0].evidenceRef.startsWith("P2's comment “")).toBe(true)
  })

  it('responses are rated by evidence, not by posture', () => {
    expect(rateResponse('2:1', 'qualify', 'P2 says she would have to have an answer, which is about being judged')).toBe('engaged')
    expect(rateResponse('2:1', 'revise', 'P6 also describes taking up time when others go through worse')).toBe('engaged')
    expect(rateResponse(null, 'revise', 'fair point')).toBe('capitulated')
    expect(rateResponse(null, 'defend', 'no')).toBe('dismissed')
  })
})

describe('Competency profile fairness', () => {
  it('bonus peer-review responses add evidence but never change a level', () => {
    const nodes = { S1: 'strong', S2: 'precise', S3_route: 'S3A', S4: 'S4-Mechanism', S5: 'integrated' } as const
    const extras = { memoNamesP4P7: true, codebookSize: 9, reflections: 2 }
    const without = competencyProfile(nodes, 1, false, [], extras)
    const withBonus = competencyProfile(nodes, 1, true, ['engaged', 'engaged', 'engaged'], extras)
    expect(withBonus.map((r) => r.level)).toEqual(without.map((r) => r.level))
    // only the five source-bound competencies are levelled
    expect(without.filter((r) => r.level).map((r) => r.name)).toEqual([
      'Coding Precision',
      'Category Development',
      'Theme Quality',
      'Recognition of Contradictions',
      'Transparency of Decision-Making',
    ])
  })
})
