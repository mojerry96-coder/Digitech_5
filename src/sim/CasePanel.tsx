import { useEffect, useMemo, useState } from 'react'
import { useProject } from '../store/project'
import { useSession, type Consequence, type Flag } from './session'
import { useUI } from '../store/ui'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { COPY, COPY2, COPY3, EXACT } from '../content/script'
import { CANDIDATE_THEMES, DIVERGENCES } from '../content/answerKey'
import { docProgress, finishCoding, finishP8, finishSegmenting, paragraphWords } from './gameplay1'
import { categoriesReady, confirmCount, confirmRanking, finishCategories, openThemeMap, setRanking, startGP2 } from './gameplay2'
import { jigsawStatus, startGP3, toMemo } from './gameplay3'
import { countRisk } from './analysis'
import { fieldNotesLinked, MAP_ID, openBinsFullWidth, openMapFullWidth } from './flow'
import { CaretDownIcon, CaretUpIcon, CheckIcon, ChevronDown, ChevronRight, ClockIcon, InfoIcon, PlayIcon } from '../components/icons'
import { TONE_COLOURS } from './tones'

export { TONE_COLOURS }

const FLAG_LABEL: Record<Flag, { text: string; tone: keyof typeof TONE_COLOURS; from: string }> = {
  blended: { text: 'Blended units', tone: 'developing', from: 'Segmentation' },
  fragmented: { text: EXACT.signalLost, tone: 'weak', from: 'Segmentation' },
  overload: { text: 'Code overload', tone: 'developing', from: 'First-pass coding' },
  'cannot-generalise': { text: 'Codebook cannot generalise', tone: 'weak', from: 'First-pass coding' },
  'reliability-check-incomplete': { text: 'Reliability check incomplete', tone: 'remedial', from: 'Reconciliation' },
  'field-tested-codebook': { text: 'Field-Tested Codebook', tone: 'bonus', from: 'Codebook audit' },
  vague: { text: 'Vague categories', tone: 'developing', from: 'Categories' },
  'count-overgeneralised': { text: 'Over-generalisation risk', tone: 'developing', from: 'Categories' },
  'count-fragmented': { text: 'Fragmentation risk', tone: 'developing', from: 'Categories' },
  overcorrected: { text: 'Theme over-corrected', tone: 'developing', from: 'Negative case' },
  inflated: { text: 'Negative case set aside', tone: 'weak', from: 'Negative case' },
  'theme-misranked': { text: 'Top theme misranked', tone: 'developing', from: 'Theme ranking' },
}

function Banner({ c }: { c: Consequence }) {
  const col = TONE_COLOURS[c.tone]
  return (
    <div className={'consequence' + (c.tone === 'developing' || c.tone === 'negative' ? ' dark-text' : '')} style={{ background: col }} role="status" aria-live="polite">
      <strong>{c.title}</strong>
      <p>{c.text}</p>
    </div>
  )
}

/** Earlier decisions resurfacing: same tier colour, dashed border, "from earlier analysis". */
function Callbacks({ flags, current, showing }: { flags: Flag[]; current: string[]; showing?: string }) {
  const shown = flags.filter((f) => !current.includes(FLAG_LABEL[f].from) && FLAG_LABEL[f].text !== showing)
  if (!shown.length) return null
  return (
    <ul className="callbacks" aria-label="From earlier analysis">
      {shown.map((f) => (
        <li key={f} style={{ borderColor: TONE_COLOURS[FLAG_LABEL[f].tone] }}>
          <span className="cb-dot" style={{ background: TONE_COLOURS[FLAG_LABEL[f].tone] }} />
          {FLAG_LABEL[f].text}
          <span className="cb-from">
            <ClockIcon size={11} /> from {FLAG_LABEL[f].from.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Steps({ labels, index, allDone }: { labels: string[]; index: number; allDone: boolean }) {
  return (
    <ol className="steps" aria-label="Phases">
      {labels.map((l, i) => {
        const done = allDone || i < index
        return (
          <li key={l} className={done ? 'done' : i === index ? 'current' : ''} aria-current={i === index && !allDone ? 'step' : undefined}>
            <span className="step-n">{done ? <CheckIcon size={16} weight="fill" /> : i + 1}</span>
            {l}
          </li>
        )
      })}
    </ol>
  )
}

function DocList({ mode }: { mode: 'segments' | 'coded' }) {
  const p = useProject()
  const rows = useMemo(docProgress, [p.quotations, p.codings, p.docs])
  return (
    <ul className="doc-progress">
      {rows.map(({ doc, segments, coded }) => {
        const n = mode === 'segments' ? segments : coded
        return (
          <li key={doc.id}>
            <button onClick={() => p.openTab({ kind: 'document', id: doc.id }, 0)}>
              <span className="ptag" style={{ background: PARTICIPANT_COLOURS[doc.participant] }}>
                {doc.participant}
              </span>
              <span className="dp-name">{doc.name.replace(/^P\d /, '')}</span>
              <span className={'dp-n' + (n ? ' ok' : '')}>{mode === 'segments' ? `${n} segment${n === 1 ? '' : 's'}` : `${coded}/${segments} coded`}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Keyboard/tap equivalent of drag-selecting a span (storyboard §9). */
function KeyboardSegmenter() {
  const p = useProject()
  const ui = useUI()
  const docs = p.docs.filter((d) => ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(d.participant))
  const [docId, setDocId] = useState(docs[0]?.id ?? 1)
  const doc = docs.find((d) => d.id === docId)
  const paras = (doc?.paragraphs ?? []).map((t, i) => ({ t, i })).filter((x) => /^P\d:/.test(x.t))
  const [pi, setPi] = useState(paras[0]?.i ?? 0)
  const wordsList = useMemo(() => paragraphWords(docId, pi), [docId, pi])
  const [a, setA] = useState(2)
  const [b, setB] = useState(6)
  useEffect(() => {
    setA(2)
    setB(Math.min(wordsList.length, 6))
  }, [wordsList])
  const lo = Math.max(1, Math.min(a, b))
  const hi = Math.min(wordsList.length, Math.max(a, b))
  const preview = wordsList.slice(lo - 1, hi).map((w) => w.word).join(' ')
  return (
    <div className="kb-seg">
      <label>
        Document
        <select value={docId} onChange={(e) => { setDocId(Number(e.target.value)); setPi(1) }}>
          {docs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.participant}
            </option>
          ))}
        </select>
      </label>
      <label>
        Paragraph
        <select value={pi} onChange={(e) => setPi(Number(e.target.value))}>
          {paras.map((x) => (
            <option key={x.i} value={x.i}>
              ¶{x.i + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="kb-range">
        <label>
          Start word
          <input type="number" min={1} max={wordsList.length} value={a} onChange={(e) => setA(Number(e.target.value))} />
        </label>
        <label>
          End word
          <input type="number" min={1} max={wordsList.length} value={b} onChange={(e) => setB(Number(e.target.value))} />
        </label>
      </div>
      <p className="kb-preview" aria-live="polite">
        {preview || '—'}
      </p>
      <button
        className="btn"
        disabled={!wordsList.length}
        onClick={() => {
          const s = wordsList[lo - 1]
          const e = wordsList[hi - 1]
          if (!s || !e) return
          const q = p.createQuotation({ docId, start: s.start, end: e.end })
          p.openTab({ kind: 'document', id: docId }, 0)
          ui.showToast(`Quotation ${q.id} created`)
        }}
      >
        Create Free Quotation
      </button>
    </div>
  )
}

/** Soft 90-second suggestion for P8 — pausable, hideable, never fails. */
function SoftTimer() {
  const [left, setLeft] = useState(90)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (paused || left <= 0) return
    const t = window.setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left, paused])
  if (hidden)
    return (
      <button className="link-btn" onClick={() => setHidden(false)}>
        Show suggested time
      </button>
    )
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="soft-timer" role="timer" aria-label={`${COPY.p8.timerLabel}: ${mm} minutes ${ss} seconds remaining`}>
      <span className="st-label">{COPY.p8.timerLabel}</span>
      <span className="st-time" aria-hidden="true">
        {left > 0 ? `${mm}:${ss}` : '—'}
      </span>
      <button className="link-btn" onClick={() => setPaused((x) => !x)}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button className="link-btn" onClick={() => setHidden(true)}>
        Hide
      </button>
      {left <= 0 && <p className="st-done">{COPY.p8.timerDone}</p>}
    </div>
  )
}

/* ------------------------------ Gameplay 1 ------------------------------ */

function GP1Sections() {
  const s = useSession()
  const p = useProject()
  const [kbOpen, setKbOpen] = useState(false)
  const rows = useMemo(docProgress, [p.quotations, p.codings, p.docs])
  const phase = s.gp1Phase
  const allSegmented = rows.every((r) => r.segments > 0)
  const allCoded = rows.every((r) => r.coded > 0)
  const suggested = p.codes.filter((c) => c.suggested).length
  return (
    <>
      {phase === 'A' && (
        <section className="case-section">
          <h3>{COPY.phaseA.title}</h3>
          <p className="case-task">{COPY.phaseA.task}</p>
          <p className="case-how">{COPY.phaseA.how}</p>
          <DocList mode="segments" />
          <button className="disclosure" onClick={() => setKbOpen((x) => !x)} aria-expanded={kbOpen}>
            {kbOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />} Select with keyboard
          </button>
          {kbOpen && <KeyboardSegmenter />}
          <button className="btn primary block" disabled={!allSegmented} onClick={finishSegmenting}>
            {COPY.phaseA.finish}
          </button>
          {!allSegmented && <p className="case-gate">{COPY.phaseA.needAll}</p>}
        </section>
      )}
      {phase === 'B' && (
        <section className="case-section">
          <h3>{COPY.phaseB.title}</h3>
          <p className="case-task">{COPY.phaseB.task}</p>
          <p className="case-how">{COPY.phaseB.how}</p>
          {suggested > 0 && <p className="case-how">{COPY.phaseB.suggestionsNote}</p>}
          <DocList mode="coded" />
          <button className="btn primary block" disabled={!allCoded} onClick={finishCoding}>
            {COPY.phaseB.finish}
          </button>
          {!allCoded && <p className="case-gate">{COPY.phaseB.needAll}</p>}
        </section>
      )}
      {phase === 'C' && (
        <section className="case-section">
          <h3>{COPY.phaseC.title}</h3>
          <p className="case-task">{COPY.phaseC.task}</p>
          <ul className="recon-status">
            {DIVERGENCES.map((d) => {
              const a = s.recon[d.participant]
              return (
                <li key={d.participant}>
                  <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>
                    {d.participant}
                  </span>
                  {a.cls && a.action ? 'Classified · action chosen' : a.cls ? 'Classified · choose an action' : 'Not yet classified'}
                </li>
              )
            })}
          </ul>
          <button className="btn block" onClick={() => p.openTab({ kind: 'ica' }, 0)}>
            Open Intercoder Agreement
          </button>
        </section>
      )}
      {phase === 'S3A' && (
        <section className="case-section bonus">
          <h3>{COPY.p8.title}</h3>
          <p className="case-task">{COPY.p8.task}</p>
          <SoftTimer />
          <button className="btn block" onClick={() => p.openTab({ kind: 'document', id: 8 }, 0)}>
            Open P8
          </button>
          <button className="btn primary block" onClick={finishP8}>
            {COPY.p8.finish}
          </button>
        </section>
      )}
      {phase === 'S3C' && (
        <section className="case-section remedial">
          <h3>{COPY.coach.title}</h3>
          <p className="case-task">Look at the P4 divergence again, with both readings laid out.</p>
          <button className="btn primary block" onClick={() => p.openTab({ kind: 'ica' }, 0)}>
            Open check-in
          </button>
        </section>
      )}
      {phase === 'done' && (
        <section className="case-section">
          <h3>{COPY.done.title}</h3>
          <dl className="case-summary">
            <dt>Segmentation</dt>
            <dd>{s.branchState.S1}</dd>
            <dt>First-pass coding</dt>
            <dd>{s.branchState.S2}</dd>
            <dt>Reconciliation</dt>
            <dd>{s.branchState.S3_route}</dd>
            <dt>Codebook</dt>
            <dd>{s.codebook.length} codes</dd>
          </dl>
          <button className="btn primary block" onClick={startGP2}>
            {COPY.done.next}
          </button>
        </section>
      )}
    </>
  )
}

/* ------------------------------ Gameplay 2 ------------------------------ */

function CountStepper() {
  const [n, setN] = useState(4)
  const risk = countRisk(n)
  return (
    <div className="count-step">
      <div className="stepper big" role="group" aria-label="Category count">
        <button className="step-btn" disabled={n <= 2} onClick={() => setN(n - 1)} aria-label="Fewer categories">
          −
        </button>
        <span className="step-val" aria-live="polite">
          {n}
        </span>
        <button className="step-btn" disabled={n >= 6} onClick={() => setN(n + 1)} aria-label="More categories">
          +
        </button>
      </div>
      {risk !== 'none' && (
        <p className="warn-inline" role="alert">
          {COPY2.count.warnings[risk]}
        </p>
      )}
      <button className="btn primary block" onClick={() => confirmCount(n)}>
        {COPY2.count.confirm}
      </button>
    </div>
  )
}

function ThemeRanking() {
  const s = useSession()
  const order = s.themeRanking.length ? s.themeRanking : CANDIDATE_THEMES.map((t) => t.id)
  const [dragId, setDragId] = useState<string | null>(null)
  const move = (id: string, to: number) => {
    const next = order.filter((x) => x !== id)
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id)
    setRanking(next)
  }
  return (
    <ol className="rank-list" aria-label="Candidate themes in rank order">
      {order.map((id, i) => {
        const t = CANDIDATE_THEMES.find((x) => x.id === id)!
        return (
          <li
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && move(dragId, i)}
            className={dragId === id ? 'dragging' : ''}
          >
            <span className="rank-n">{i + 1}</span>
            <div className="rank-body">
              <strong>{t.label}</strong>
              <p>{t.statement}</p>
            </div>
            <div className="rank-btns">
              <button className="rank-btn" disabled={i === 0} onClick={() => move(id, i - 1)} aria-label={`Move “${t.label}” up`}>
                <CaretUpIcon size={12} />
              </button>
              <button className="rank-btn" disabled={i === order.length - 1} onClick={() => move(id, i + 1)} aria-label={`Move “${t.label}” down`}>
                <CaretDownIcon size={12} />
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function GP2Sections() {
  const s = useSession()
  const p = useProject()
  const phase = s.gp2Phase
  const fn = useProject(() => fieldNotesLinked())
  const dots = (
    <div className="dots-box">
      <strong>{COPY2.dots.title}</strong>
      <p>{COPY2.dots.text}</p>
      <p className="case-gate">{fn}/2 field notes linked</p>
      <button className="btn block" onClick={openThemeMap}>
        {COPY2.dots.open}
      </button>
    </div>
  )
  return (
    <>
      {phase === 'count' && (
        <section className="case-section">
          <h3>{COPY2.count.title}</h3>
          <p className="case-task">{COPY2.count.task}</p>
          <CountStepper />
        </section>
      )}
      {phase === 'sort' && (
        <section className="case-section">
          <h3>{COPY2.sort.title}</h3>
          <p className="case-task">{COPY2.sort.task}</p>
          <button className="btn block" onClick={openBinsFullWidth}>
            Open Sort into Bins
          </button>
          <button className="btn primary block" onClick={finishCategories} disabled={!categoriesReady(s.categoriesDraft)}>
            {COPY2.sort.finish}
          </button>
        </section>
      )}
      {phase === 'rank' && (
        <section className="case-section">
          <h3>{COPY2.rank.title}</h3>
          <p className="case-task">{COPY2.rank.task}</p>
          <ThemeRanking />
          <button className="btn primary block" onClick={confirmRanking}>
            {COPY2.rank.confirm}
          </button>
        </section>
      )}
      {phase === 'stress' && (
        <section className="case-section">
          <h3>{COPY2.stress.title}</h3>
          <p className="case-task">{COPY2.stress.task}</p>
          <button className="btn block" onClick={() => p.openTab({ kind: 'document', id: 7 }, 0)}>
            Read P7
          </button>
          <button className="btn primary block" onClick={() => p.openTab({ kind: 'stress' }, 0)}>
            Open stress test
          </button>
          {dots}
        </section>
      )}
      {phase === 'done' && (
        <section className="case-section">
          <h3>Interpretation stress-tested</h3>
          <dl className="case-summary">
            <dt>Categories</dt>
            <dd>
              {s.branchState.S4} ({s.branchState.S4_categoryCount})
            </dd>
            <dt>Top theme</dt>
            <dd>{s.theme?.label}</dd>
            <dt>P7</dt>
            <dd>{s.branchState.S5}</dd>
          </dl>
          {dots}
          <button className="btn primary block" onClick={startGP3}>
            {COPY2.done.next}
          </button>
        </section>
      )}
    </>
  )
}

/* ------------------------------ Gameplay 3 ------------------------------ */

function GP3Sections() {
  const s = useSession()
  const p = useProject()
  // re-evaluate whenever the map or codings change
  useProject((st) => st.networks.find((n) => n.id === MAP_ID))
  const j = jigsawStatus()
  return (
    <>
      {s.gp3Phase === 'jigsaw' && (
        <section className="case-section">
          <h3>{COPY3.jigsaw.title}</h3>
          <p className="case-task">{COPY3.jigsaw.task}</p>
          <div className="jig-meter" aria-label={`Jigsaw ${Math.round(j.completeness * 100)} percent linked`}>
            <span style={{ width: `${j.completeness * 100}%` }} />
          </div>
          <p className="case-gate">{Math.round(j.completeness * 100)}% linked</p>
          {j.missing.length > 0 && (
            <ul className="jig-missing" aria-label="Missing links">
              {j.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <button className="btn block" onClick={openMapFullWidth}>
            Open interpretation map
          </button>
          <button className="btn primary block" onClick={toMemo}>
            {COPY3.jigsaw.next}
          </button>
        </section>
      )}
      {s.gp3Phase === 'memo' && (
        <section className="case-section">
          <h3>{COPY3.memo.title}</h3>
          <p className="case-task">{COPY3.memo.task}</p>
          <button className="btn primary block" onClick={() => p.openTab({ kind: 'memoEditor' }, 0)}>
            Open memo
          </button>
          <button className="btn block" onClick={() => p.openTab({ kind: 'network', id: MAP_ID }, 1)}>
            View interpretation map
          </button>
        </section>
      )}
      {s.gp3Phase === 'review' && (
        <section className="case-section bonus">
          <h3>{COPY3.review.title}</h3>
          <p className="case-task">{COPY3.review.intro}</p>
          <button className="btn primary block" onClick={() => p.openTab({ kind: 'peerReview' }, 0)}>
            Open challenges
          </button>
        </section>
      )}
    </>
  )
}

/** Title, phase steps and which earlier-decision labels count as "current" for the active sequence. */
function useCaseMeta() {
  const s = useSession()
  if (s.sequence === 'GP1')
    return {
      title: 'Build the Codebook',
      steps: ['Segment', 'Code', 'Reconcile'],
      index: s.gp1Phase === 'A' ? 0 : s.gp1Phase === 'B' ? 1 : 2,
      allDone: s.gp1Phase === 'done',
      current: [s.gp1Phase === 'A' ? 'Segmentation' : s.gp1Phase === 'B' ? 'First-pass coding' : 'Reconciliation', 'Codebook audit'],
    }
  if (s.sequence === 'GP2') {
    const index = s.gp2Phase === 'count' || s.gp2Phase === 'sort' ? 0 : s.gp2Phase === 'rank' ? 1 : 2
    return {
      title: 'Stress-Test the Interpretation',
      steps: ['Categories', 'Themes', 'P7'],
      index,
      allDone: s.gp2Phase === 'done',
      current: [index === 0 ? 'Categories' : index === 1 ? 'Theme ranking' : 'Negative case'],
    }
  }
  return {
    title: 'Defend the Interpretation',
    steps: ['Jigsaw', 'Memo', 'Challenge'],
    index: s.gp3Phase === 'jigsaw' ? 0 : s.gp3Phase === 'memo' ? 1 : 2,
    allDone: s.gp3Phase === 'done',
    current: [] as string[],
  }
}

/** Focus mode folds earlier-decision callbacks into one chip. */
function EarlierChip({ flags, current, showing }: { flags: Flag[]; current: string[]; showing?: string }) {
  const [open, setOpen] = useState(false)
  const n = flags.filter((f) => !current.includes(FLAG_LABEL[f].from) && FLAG_LABEL[f].text !== showing).length
  if (!n) return null
  return (
    <div className="earlier">
      <button className="earlier-chip" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <ClockIcon size={14} /> From earlier · {n}
        {open ? <CaretUpIcon size={12} /> : <CaretDownIcon size={12} />}
      </button>
      {open && <Callbacks flags={flags} current={current} showing={showing} />}
    </div>
  )
}

/** The case guidance itself — used by the classic Case panel and by the focus-mode rail. */
export function CaseBody() {
  const s = useSession()
  const ui = useUI()
  const m = useCaseMeta()
  const [how, setHow] = useState(false)
  return (
    <div className={'case-body' + (how ? ' show-how' : '')}>
      {ui.focusMode && <div className="case-title">{m.title}</div>}
      <Steps labels={m.steps} index={m.index} allDone={m.allDone} />
      {s.consequence && <Banner c={s.consequence} />}
      {ui.focusMode ? (
        <EarlierChip flags={s.flags} current={m.current} showing={s.consequence?.title} />
      ) : (
        <Callbacks flags={s.flags} current={m.current} showing={s.consequence?.title} />
      )}
      {s.sequence === 'GP1' && <GP1Sections />}
      {s.sequence === 'GP2' && <GP2Sections />}
      {s.sequence === 'GP3' && <GP3Sections />}
      {ui.focusMode && (
        <button className="link-btn how-toggle" onClick={() => setHow((x) => !x)} aria-expanded={how}>
          <InfoIcon size={14} /> {how ? 'Hide tips' : 'How do I do this?'}
        </button>
      )}
      <button className="link-btn case-walk" onClick={() => useUI.getState().setWalkthrough(true)}>
        <PlayIcon size={14} /> Watch walkthrough
      </button>
    </div>
  )
}

export function CasePanel() {
  const m = useCaseMeta()
  const [open, setOpen] = useState(true)
  if (!open)
    return (
      <aside className="case-panel collapsed" aria-label="Case">
        <button className="case-toggle" onClick={() => setOpen(true)} aria-label="Show case panel">
          <CaretDownIcon size={12} style={{ transform: 'rotate(90deg)' }} /> Case
        </button>
      </aside>
    )
  return (
    <aside className="case-panel" aria-label="Case">
      <div className="pane-header">
        <span>Case · {m.title}</span>
        <button className="case-toggle inline" onClick={() => setOpen(false)} aria-label="Hide case panel">
          <CaretDownIcon size={12} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>
      <CaseBody />
    </aside>
  )
}
