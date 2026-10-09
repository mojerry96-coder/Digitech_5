import { useMemo } from 'react'
import { useProject, codeColour, CODE_TYPE_COLOURS, type CodeType } from '../store/project'
import { useSession } from './session'
import { CANDIDATE_THEMES, P7_STEP1, P7_STEP2 } from '../content/answerKey'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { COPY2 } from '../content/script'
import { codeRefCategories, countRisk, groupCoherence } from './analysis'
import { assignCode, categorisableCodes, categoriesReady, changeCount, commitStressTest, finishCategories, renameCategory, setP7 } from './gameplay2'
import { CodeIcon } from '../components/icons'
import { TONE_COLOURS } from './tones'

const CODE_MIME = 'application/x-qcs-code'

function CodeChip({ id, categories, current }: { id: string; categories: { id: string; name: string }[]; current: string | null }) {
  const c = useProject((s) => s.codes.find((x) => x.id === id))
  if (!c) return null
  return (
    <div
      className="bin-chip"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(CODE_MIME, c.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      style={{ borderLeftColor: codeColour(c) ?? '#C9CED6' }}
    >
      <CodeIcon size={12} color={codeColour(c)} />
      <span className="bin-chip-name">{c.name}</span>
      <select
        className="bin-move"
        value={current ?? ''}
        aria-label={`Category for ${c.name}`}
        onChange={(e) => assignCode(c.id, e.target.value || null)}
      >
        <option value="">Unsorted</option>
        {categories.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Sort into Bins — category containers become ATLAS.ti Code Groups on finish. */
export function CategoryBoard() {
  const s = useSession()
  const p = useProject()
  const codes = categorisableCodes()
  const refs = useMemo(() => codeRefCategories(p.docs, p.quotations, p.codes, p.codings, p.currentUser), [p.docs, p.quotations, p.codes, p.codings, p.currentUser])
  const count = s.categoryCount ?? 0
  const risk = countRisk(count)
  const placed = new Set(s.categoriesDraft.flatMap((c) => c.memberCodeIds))
  const unsorted = codes.filter((c) => !placed.has(c.id))
  const ready = categoriesReady(s.categoriesDraft)
  const locked = s.gp2Phase !== 'sort'

  if (s.gp2Phase === 'count') return <div className="empty-view">Choose a category count first.</div>

  const drop = (catId: string | null) => (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(CODE_MIME)
    if (!id || locked) return
    e.preventDefault()
    assignCode(id, catId)
  }
  const allow = (e: React.DragEvent) => !locked && e.dataTransfer.types.includes(CODE_MIME) && e.preventDefault()

  return (
    <div className="bins-view">
      <div className="bins-top">
        <h2>Sort into Bins</h2>
        <div className="stepper" role="group" aria-label="Category count">
          <button className="step-btn" disabled={locked || count <= 2} onClick={() => changeCount(count - 1)} aria-label="Fewer categories">
            −
          </button>
          <span className="step-val" aria-live="polite">
            {count} categories
          </span>
          <button className="step-btn" disabled={locked || count >= 6} onClick={() => changeCount(count + 1)} aria-label="More categories">
            +
          </button>
        </div>
      </div>
      {risk !== 'none' && (
        <div className="warn-bar developing" role="alert">
          {COPY2.count.warnings[risk]}
        </div>
      )}
      <div className="bins-layout">
        <section className="bins-unsorted" onDragOver={allow} onDrop={drop(null)} aria-label="Unsorted codes">
          <h3>
            Codes <span className="tree-count">({unsorted.length} unsorted)</span>
          </h3>
          {unsorted.map((c) => (
            <CodeChip key={c.id} id={c.id} categories={s.categoriesDraft} current={null} />
          ))}
          {!unsorted.length && <p className="muted small-note">All codes are sorted.</p>}
        </section>
        <div className="bins-grid">
          {s.categoriesDraft.map((cat) => {
            const coh = groupCoherence(cat.memberCodeIds, refs)
            const border = !cat.memberCodeIds.length ? '#cbd5e1' : coh.score >= 0.75 ? TONE_COLOURS.strong : coh.score >= 0.5 ? TONE_COLOURS.developing : TONE_COLOURS.weak
            // tint from the dominant member code type
            const types = cat.memberCodeIds.map((id) => p.codes.find((c) => c.id === id)?.type).filter((t): t is CodeType => !!t)
            const dominant = types.sort((a, b) => types.filter((x) => x === b).length - types.filter((x) => x === a).length)[0]
            const tint = dominant ? CODE_TYPE_COLOURS[dominant] + '14' : '#ffffff'
            return (
              <section
                key={cat.id}
                className="bin"
                style={{ borderColor: border, background: tint }}
                onDragOver={allow}
                onDrop={drop(cat.id)}
                aria-label={`Category ${cat.name}`}
              >
                <div className="bin-head">
                  <input
                    className="bin-name"
                    value={cat.name}
                    disabled={locked}
                    onChange={(e) => renameCategory(cat.id, e.target.value)}
                    aria-label="Category name"
                  />
                  <span className="bin-coh" style={{ color: border }} title="Container coherence">
                    {cat.memberCodeIds.length ? (coh.score >= 0.75 ? 'Coherent' : coh.score >= 0.5 ? 'Mixed' : 'Unrelated') : 'Empty'}
                  </span>
                </div>
                {cat.memberCodeIds.map((id) => (
                  <CodeChip key={id} id={id} categories={s.categoriesDraft} current={cat.id} />
                ))}
                {!cat.memberCodeIds.length && <p className="bin-empty">Drop codes here</p>}
              </section>
            )
          })}
        </div>
      </div>
      {!locked && (
        <div className="bins-actions">
          {!ready && <span className="case-gate">{COPY2.sort.needAll}</span>}
          <button className="btn primary" disabled={!ready} onClick={finishCategories}>
            {COPY2.sort.finish}
          </button>
        </div>
      )}
    </div>
  )
}

/** Conditional Simulator: stress-test the top-ranked theme against P7. */
export function StressTest() {
  const s = useSession()
  const p = useProject()
  const top = CANDIDATE_THEMES.find((t) => t.id === s.themeRanking[0])
  const p7 = p.docs.find((d) => d.participant === 'P7')
  const done = s.gp2Phase === 'done'
  if (!top || !p7) return <div className="empty-view">P7 hasn’t arrived yet.</div>
  const canCommit = s.p7.step1 && (s.p7.step1 !== 'boundary' || s.p7.step2)

  return (
    <div className="stress-view">
      <h2>{COPY2.stress.title}</h2>
      <div className="stress-cols">
        <section className="stress-theme">
          <div className="stress-label">Your top-ranked theme</div>
          <h3>{top.label}</h3>
          <p>{s.theme && done ? s.theme.statement : top.statement}</p>
        </section>
        <section className="stress-case">
          <div className="stress-label">
            <span className="ptag" style={{ background: PARTICIPANT_COLOURS.P7 }}>
              P7
            </span>{' '}
            Late negative case
          </div>
          {p7.paragraphs
            .filter((x) => x.startsWith('P7:'))
            .map((x, i) => (
              <p key={i} className="stress-excerpt">
                {x.replace(/^P7:\s*/, '')}
              </p>
            ))}
        </section>
      </div>
      <fieldset className="ica-field" disabled={done}>
        <legend>{P7_STEP1.prompt}</legend>
        <div className="ica-options">
          {P7_STEP1.options.map((o) => (
            <label key={o.id} className={'ica-opt wide' + (s.p7.step1 === o.id ? ' on' : '')}>
              <input type="radio" name="p7-1" checked={s.p7.step1 === o.id} onChange={() => setP7('step1', o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {s.p7.step1 === 'boundary' && (
        <fieldset className="ica-field" disabled={done}>
          <legend>{P7_STEP2.prompt}</legend>
          <div className="ica-options">
            {P7_STEP2.options.map((o) => (
              <label key={o.id} className={'ica-opt wide' + (s.p7.step2 === o.id ? ' on' : '')}>
                <input type="radio" name="p7-2" checked={s.p7.step2 === o.id} onChange={() => setP7('step2', o.id)} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!done && (
        <div className="ica-actions">
          <button className="btn primary" disabled={!canCommit} onClick={commitStressTest}>
            {COPY2.stress.commit}
          </button>
        </div>
      )}
    </div>
  )
}
