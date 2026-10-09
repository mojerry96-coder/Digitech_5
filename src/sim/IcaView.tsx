import { useState } from 'react'
import { useProject, codeColour } from '../store/project'
import { useSession } from './session'
import { COACH_OPTIONS, COACH_QUESTION, DIVERGENCE_CLASSES, DIVERGENCES, type Divergence } from '../content/answerKey'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { COPY } from '../content/script'
import { locateUnits } from './analysis'
import { completeCoach, submitReconciliation } from './gameplay1'
import { CodeIcon } from '../components/icons'

/** The learner's codes on the quotations that overlap a divergence's units. */
function useMyCodes(d: Divergence) {
  const p = useProject()
  const units = locateUnits(p.docs).filter((u) => d.unitIds.includes(u.id))
  const qs = p.quotations.filter((q) => units.some((u) => q.docId === u.docId && q.start < u.end && q.end > u.start))
  const ids = new Set(qs.map((q) => q.id))
  const codeIds = [...new Set(p.codings.filter((c) => ids.has(c.quotationId) && c.coder === p.currentUser).map((c) => c.codeId))]
  return { units, codes: codeIds.map((id) => p.codes.find((c) => c.id === id)!).filter(Boolean), qids: [...ids] }
}

function CodeChip({ name, color, coder }: { name: string; color?: string; coder?: 'me' | 'c2' }) {
  return (
    <span className={'ica-chip' + (coder === 'c2' ? ' c2' : '')} style={{ borderLeftColor: color ?? '#C9CED6' }}>
      <CodeIcon size={12} color={color} />
      {name}
    </span>
  )
}

function DivergenceCard({ d, readOnly }: { d: Divergence; readOnly: boolean }) {
  const s = useSession()
  const p = useProject()
  const mine = useMyCodes(d)
  const answer = s.recon[d.participant]
  const name = `div-${d.participant}`
  return (
    <section className="ica-card" aria-labelledby={`${name}-h`}>
      <header className="ica-card-head">
        <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>
          {d.participant}
        </span>
        <h3 id={`${name}-h`}>Divergence on {d.participant}</h3>
        {answer.cls && answer.action && <span className="ica-status">Ready</span>}
      </header>
      <blockquote className="ica-excerpt">{mine.units.map((u) => u.text).join(' ')}</blockquote>
      <div className="ica-compare">
        <div>
          <div className="ica-col-head">
            <span className="coder-dot me" /> {p.currentUser}
          </div>
          {mine.codes.length ? (
            <div className="ica-chips">
              {mine.codes.map((c) => (
                <CodeChip key={c.id} name={c.name} color={codeColour(c)} />
              ))}
            </div>
          ) : (
            <p className="muted small-note">Not coded in your first pass.</p>
          )}
          {mine.codes.filter((c) => c.comment).map((c) => (
            <p key={c.id} className="ica-rationale">
              {c.comment}
            </p>
          ))}
        </div>
        <div>
          <div className="ica-col-head">
            <span className="coder-dot c2" /> Coder 2
          </div>
          <div className="ica-chips">
            <CodeChip name={d.coder2Code.name} coder="c2" />
          </div>
          <p className="ica-rationale">“{d.coder2Rationale}”</p>
        </div>
      </div>

      <fieldset className="ica-field" disabled={readOnly}>
        <legend>Classify the divergence</legend>
        <div className="ica-options cls">
          {DIVERGENCE_CLASSES.map((c) => (
            <label key={c.id} className={'ica-opt' + (answer.cls === c.id ? ' on' : '')}>
              <input
                type="radio"
                name={`${name}-cls`}
                checked={answer.cls === c.id}
                onChange={() => s.setRecon(d.participant, { cls: c.id })}
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="ica-field" disabled={readOnly}>
        <legend>Action</legend>
        <div className="ica-options">
          {d.actions.map((a) => (
            <label key={a.id} className={'ica-opt wide' + (answer.action === a.id ? ' on' : '')}>
              <input
                type="radio"
                name={`${name}-act`}
                checked={answer.action === a.id}
                onChange={() => s.setRecon(d.participant, { action: a.id })}
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  )
}

function CoachCheckIn() {
  const p = useProject()
  const d = DIVERGENCES.find((x) => x.participant === 'P4')!
  const mine = useMyCodes(d)
  const [pick, setPick] = useState<string | null>(null)
  const chosen = COACH_OPTIONS.find((o) => o.id === pick)
  return (
    <section className="ica-card coach" aria-label="Coach check-in">
      <header className="ica-card-head">
        <span className="ptag" style={{ background: PARTICIPANT_COLOURS.P4 }}>
          P4
        </span>
        <h3>{COPY.coach.title}: the P4 divergence, side by side</h3>
      </header>
      <blockquote className="ica-excerpt">{mine.units.map((u) => u.text).join(' ')}</blockquote>
      <div className="ica-compare">
        <div>
          <div className="ica-col-head">
            <span className="coder-dot me" /> {p.currentUser} — your reading
          </div>
          <div className="ica-chips">
            {mine.codes.length ? mine.codes.map((c) => <CodeChip key={c.id} name={c.name} color={codeColour(c)} />) : <span className="muted">Not coded</span>}
          </div>
          <p className="ica-rationale">
            {mine.codes.length
              ? `You coded these lines as ${mine.codes.map((c) => `“${c.name}”`).join(', ')} — naming what P4 says.`
              : 'You left these lines uncoded in your first pass.'}
          </p>
        </div>
        <div>
          <div className="ica-col-head">
            <span className="coder-dot c2" /> Coder 2 — their reading
          </div>
          <div className="ica-chips">
            <CodeChip name={d.coder2Code.name} coder="c2" />
          </div>
          <p className="ica-rationale">“{d.coder2Rationale}”</p>
        </div>
      </div>
      <fieldset className="ica-field">
        <legend>{COACH_QUESTION}</legend>
        <div className="ica-options">
          {COACH_OPTIONS.map((o) => (
            <label key={o.id} className={'ica-opt wide' + (pick === o.id ? ' on' : '')}>
              <input type="radio" name="coach" checked={pick === o.id} onChange={() => setPick(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {chosen && !chosen.correct && (
        <p className="coach-hint" role="status">
          {chosen.hint}
        </p>
      )}
      <div className="ica-actions">
        <button className="btn primary" disabled={!chosen?.correct} onClick={completeCoach}>
          {COPY.coach.complete}
        </button>
      </div>
    </section>
  )
}

export function IcaView() {
  const s = useSession()
  const p = useProject()
  const phase = s.gp1Phase
  const ready = DIVERGENCES.every((d) => s.recon[d.participant].cls && s.recon[d.participant].action)
  const submitted = !!s.branchState.S3_route

  if (phase === 'A' || phase === 'B')
    return <div className="empty-view">Intercoder Agreement opens after first-pass coding.</div>

  return (
    <div className="ica-view">
      <div className="ica-top">
        <div>
          <h2>Intercoder Agreement</h2>
          <p className="muted">
            Coders: <span className="coder-dot me" /> {p.currentUser} · <span className="coder-dot c2" /> Coder 2 · Documents P2, P4, P5
          </p>
        </div>
        <span className="draft-chip" title="Second coder's codes and rationale are placeholders (storyboard §10.6)">
          DRAFT Coder 2 data
        </span>
      </div>
      {phase === 'S3C' ? (
        <CoachCheckIn />
      ) : (
        <>
          {!submitted && <p className="ica-task">{COPY.phaseC.task}</p>}
          {DIVERGENCES.map((d) => (
            <DivergenceCard key={d.participant} d={d} readOnly={submitted} />
          ))}
          {!submitted && (
            <div className="ica-actions">
              <button className="btn primary" disabled={!ready} onClick={submitReconciliation}>
                {COPY.phaseC.submit}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
