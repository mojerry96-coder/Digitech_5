import { describe, expect, it } from 'vitest'
import { documents } from '../content/draftDataset'
import { REFERENCE_UNITS } from '../content/answerKey'
import type { Code, Coding, Doc, Quotation } from '../store/project'
import { classifyS1, classifyS2, evaluateP8, gradeDivergence, locateUnits, routeS3 } from './analysis'

const ME = 'Learner'

function buildDocs(withP8 = false): Doc[] {
  return documents
    .filter((d) => !d.gated || (withP8 && d.gated === 'P8'))
    .map((d) => ({
      id: Number(d.participant.slice(1)),
      name: d.title,
      participant: d.participant,
      paragraphs: d.paragraphs,
      draft: d.draft,
      groups: [],
    }))
}

/** Tiny in-memory project for building scenarios. */
function project(withP8 = false) {
  const docs = buildDocs(withP8)
  const units = locateUnits(docs)
  const quotations: Quotation[] = []
  const codes: Code[] = []
  const codings: Coding[] = []
  const quote = (docId: number, start: number, end: number) => {
    const index = quotations.filter((q) => q.docId === docId).length + 1
    const q: Quotation = { id: `${docId}:${index}`, docId, index, start, end, createdBy: ME, created: 0 }
    quotations.push(q)
    return q
  }
  const quoteUnit = (unitId: string) => {
    const u = units.find((x) => x.id === unitId)!
    return quote(u.docId, u.start, u.end)
  }
  const code = (name: string) => {
    let c = codes.find((x) => x.name === name)
    if (!c) {
      c = { id: `c${codes.length + 1}`, name, createdBy: ME, created: 0 }
      codes.push(c)
    }
    return c
  }
  const apply = (q: Quotation, name: string) => codings.push({ quotationId: q.id, codeId: code(name).id, coder: ME })
  return { docs, units, quotations, codes, codings, quote, quoteUnit, code, apply }
}

const CORE = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

describe('answer key', () => {
  it('every reference unit is found verbatim in its transcript', () => {
    const units = locateUnits(buildDocs(true))
    expect(units.map((u) => u.id).sort()).toEqual(REFERENCE_UNITS.map((u) => u.id).sort())
  })
})

describe('S1 segmentation', () => {
  it('one quotation per meaningful unit → strong', () => {
    const p = project()
    p.units.forEach((u) => p.quoteUnit(u.id))
    expect(classifyS1(p.docs, p.quotations, ME).state).toBe('strong')
  })

  it('whole-paragraph highlighting blends attitude and behaviour → coarse', () => {
    const p = project()
    for (const d of p.docs) {
      let pos = 0
      d.paragraphs.forEach((para) => {
        if (/^P\d:/.test(para)) p.quote(d.id, pos, pos + para.length)
        pos += para.length + 1
      })
    }
    expect(classifyS1(p.docs, p.quotations, ME).state).toBe('coarse')
  })

  it('single words and short fragments → fragmented', () => {
    const p = project()
    for (const u of p.units) {
      // two-word fragments from the start of every unit
      const twoWords = u.text.split(' ').slice(0, 2).join(' ')
      p.quote(u.docId, u.start, u.start + twoWords.length)
    }
    expect(classifyS1(p.docs, p.quotations, ME).state).toBe('fragmented')
  })
})

describe('S2 first-pass coding', () => {
  const MECH_CODE: Record<string, string> = {
    ENDORSE: 'speaks well of service',
    ENCOUNTER: 'speaks well of service',
    CRITIQUE: 'critical of service',
    NONENGAGE: 'not attending',
    SELFRELIANCE: 'self-reliance',
    ILLEGIT: 'not feeling entitled to help',
    STIGMA: 'fear of being seen',
    DISTRESS: 'distress',
    ACCESS: 'access barrier',
    PUBLICPRIVATE: 'public/private gap',
  }

  it('mechanism codes reused across participants → precise (confidence band 82)', () => {
    const p = project()
    for (const u of p.units) p.apply(p.quoteUnit(u.id), MECH_CODE[u.mechanism])
    expect(classifyS2(p.docs, p.quotations, p.codes, p.codings, ME).state).toBe('precise')
  })

  it('one broad code absorbing different mechanisms → overbroad', () => {
    const p = project()
    for (const u of p.units) p.apply(p.quoteUnit(u.id), u.mechanism === 'ENDORSE' ? 'likes service' : 'barriers to support')
    expect(classifyS2(p.docs, p.quotations, p.codes, p.codings, ME).state).toBe('overbroad')
  })

  it('a bespoke code for nearly every excerpt → overfitted', () => {
    const p = project()
    p.units.forEach((u, i) => p.apply(p.quoteUnit(u.id), `in vivo ${i}`))
    expect(classifyS2(p.docs, p.quotations, p.codes, p.codings, ME).state).toBe('overfitted')
  })

  it('recovery: coarse segments coded one code per idea can still reach precise', () => {
    const p = project()
    // pairs of adjacent units in one quotation (coarse), each coded with both mechanisms
    for (const part of CORE) {
      const us = p.units.filter((u) => u.participant === part)
      for (let i = 0; i < us.length; i += 2) {
        const a = us[i]
        const b = us[i + 1] ?? us[i]
        const q = p.quote(a.docId, a.start, b.end)
        p.apply(q, MECH_CODE[a.mechanism])
        if (b !== a && MECH_CODE[b.mechanism] !== MECH_CODE[a.mechanism]) p.apply(q, MECH_CODE[b.mechanism])
      }
    }
    expect(classifyS1(p.docs, p.quotations, ME).state).toBe('coarse')
    expect(classifyS2(p.docs, p.quotations, p.codes, p.codings, ME).state).toBe('precise')
  })
})

describe('S3 reconciliation gate', () => {
  it('3/3 well → S3A; 1–2/3 → S3B; 0/3 → S3C', () => {
    const well = [gradeDivergence('P2', 'broad', 'split'), gradeDivergence('P4', 'overlap', 'merge'), gradeDivergence('P5', 'variation', 'double')]
    expect(well).toEqual(['well', 'well', 'well'])
    expect(routeS3(well)).toBe('S3A')
    expect(routeS3(['well', 'partial', 'poor'])).toBe('S3B')
    const winners = [gradeDivergence('P2', 'poor', 'keep'), gradeDivergence('P4', 'variation', 'keep'), gradeDivergence('P5', 'poor', 'adopt')]
    expect(winners).toEqual(['poor', 'poor', 'poor'])
    expect(routeS3(winners)).toBe('S3C')
  })
})

describe('P8 bonus', () => {
  function withCodebook() {
    const p = project(true)
    for (const u of p.units.filter((x) => x.participant !== 'P8'))
      p.apply(p.quoteUnit(u.id), u.mechanism === 'ILLEGIT' ? 'perceived illegitimacy of need' : `other ${u.mechanism}`)
    return p
  }

  it('coding P8 with the existing illegitimacy code, no new code → success', () => {
    const p = withCodebook()
    const before = p.codes.map((c) => c.id)
    p.apply(p.quoteUnit('P8.seg1'), 'perceived illegitimacy of need')
    expect(evaluateP8(p.docs, p.quotations, p.codes, p.codings, ME, before).success).toBe(true)
  })

  it('inventing a new code for P8 → no boost (and no penalty)', () => {
    const p = withCodebook()
    const before = p.codes.map((c) => c.id)
    p.apply(p.quoteUnit('P8.seg1'), 'contradicts self')
    const r = evaluateP8(p.docs, p.quotations, p.codes, p.codings, ME, before)
    expect(r.success).toBe(false)
    expect(r.inventedCode).toBe(true)
  })
})
