import { useProject, quotationLabel } from '../store/project'
import { useSession, type MemoRecord } from './session'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { COPY3 } from '../content/script'
import { memoText, submitMemo, submitResponses } from './gameplay3'
import type { Posture } from './analysis'
import { MemoIcon } from '../components/icons'
import { useState } from 'react'

function QuotationSelect({ value, onChange, label, disabled }: { value: string | null; onChange: (id: string | null) => void; label: string; disabled?: boolean }) {
  const p = useProject()
  return (
    <select className="q-select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={label} disabled={disabled}>
      <option value="">Choose a quotation…</option>
      {p.docs.map((d) => {
        const qs = p.quotations.filter((q) => q.docId === d.id)
        if (!qs.length) return null
        return (
          <optgroup key={d.id} label={`${d.participant} — D${d.id}`}>
            {qs.map((q) => (
              <option key={q.id} value={q.id}>
                {q.id} {quotationLabel(q, p.docs).slice(0, 80)}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}

const FIELD_ORDER: (keyof Omit<MemoRecord, 'strongestEvidence' | 'strongestEvidenceNote'> | 'strongestEvidence')[] = [
  'themeClaim',
  'strongestEvidence',
  'reconciliationNote',
  'negativeCaseTreatment',
  'finalInterpretation',
]

/** Structured Memo — ATLAS.ti memo editor with template fields; Review → Confirm → Submit. */
export function MemoEditor() {
  const s = useSession()
  const [confirmed, setConfirmed] = useState(false)
  const status = s.memoStatus
  const F = COPY3.memo.fields
  if (s.gp3Phase === 'jigsaw') return <div className="empty-view">The memo opens after the jigsaw.</div>

  if (status !== 'draft') {
    return (
      <div className="memo-ed">
        <div className="memo-ed-head">
          <MemoIcon size={18} /> <strong>Interpretation memo — for the Dean</strong>
          <span className="muted"> · Type: Memo · {status === 'submitted' ? 'Submitted' : 'Review'}</span>
        </div>
        <div className="memo-review">
          {memoText().map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {status === 'review' && (
          <div className="memo-confirm">
            <label>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> {COPY3.memo.confirm}
            </label>
            <div className="memo-actions">
              <button className="btn" onClick={() => s.patch({ memoStatus: 'draft' })}>
                {COPY3.memo.edit}
              </button>
              <button className="btn primary" disabled={!confirmed} onClick={submitMemo}>
                {COPY3.memo.submit}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const filled =
    s.memo.themeClaim.trim() && s.memo.strongestEvidence && s.memo.reconciliationNote.trim() && s.memo.negativeCaseTreatment.trim() && s.memo.finalInterpretation.trim()

  return (
    <div className="memo-ed">
      <div className="memo-ed-head">
        <MemoIcon size={18} /> <strong>Interpretation memo — for the Dean</strong>
        <span className="muted"> · Type: Memo · Draft</span>
      </div>
      <form
        className="memo-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (filled) s.patch({ memoStatus: 'review' })
        }}
      >
        {FIELD_ORDER.map((k) => {
          const f = F[k]
          const id = `memo-${k}`
          if (k === 'strongestEvidence')
            return (
              <div className="memo-field" key={k}>
                <label htmlFor={id}>{f.label}</label>
                <p className="memo-hint">{f.hint}</p>
                <QuotationSelect value={s.memo.strongestEvidence} onChange={(v) => s.setMemo({ strongestEvidence: v })} label={f.label} />
                <textarea
                  id={id}
                  rows={2}
                  value={s.memo.strongestEvidenceNote}
                  placeholder="Why this quotation?"
                  onChange={(e) => s.setMemo({ strongestEvidenceNote: e.target.value })}
                />
              </div>
            )
          return (
            <div className="memo-field" key={k}>
              <label htmlFor={id}>{f.label}</label>
              <p className="memo-hint">{f.hint}</p>
              <textarea id={id} rows={k === 'finalInterpretation' ? 4 : 3} value={s.memo[k]} onChange={(e) => s.setMemo({ [k]: e.target.value })} />
            </div>
          )
        })}
        <div className="memo-actions">
          <button className="btn primary" type="submit" disabled={!filled}>
            {COPY3.memo.review}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Supervisor Challenge Memo from Dr. Marsh, answered with the Response Builder. */
export function PeerReview() {
  const s = useSession()
  const p = useProject()
  if (!s.challenges.length) return <div className="empty-view">No challenges.</div>
  const done = s.gp3Phase !== 'review'
  const ready = s.challengeResponses.every((r) => r.posture && r.rationale.trim())

  return (
    <div className="review-view">
      <div className="review-head">
        <span className="wl-msg-avatar" aria-hidden="true">
          DM
        </span>
        <div>
          <h2>{COPY3.review.title}</h2>
          <p className="muted">
            From {COPY3.review.from} · Senior colleague, peer reviewer
          </p>
        </div>
      </div>
      <p>{COPY3.review.intro}</p>
      {s.challenges.map((c, i) => {
        const r = s.challengeResponses.find((x) => x.challengeId === c.id)!
        return (
          <section key={c.id} className="challenge" aria-labelledby={`${c.id}-h`}>
            <h3 id={`${c.id}-h`}>
              {i + 1}.{' '}
              <span className="ptag" style={{ background: PARTICIPANT_COLOURS[c.participant as keyof typeof PARTICIPANT_COLOURS] }}>
                {c.participant}
              </span>
            </h3>
            <blockquote className="challenge-text">{c.text}</blockquote>
            <div className="builder">
              <div className="builder-row">
                <span className="builder-label">Evidence</span>
                <QuotationSelect value={r.evidenceQuotationId} onChange={(v) => s.setResponse(c.id, { evidenceQuotationId: v })} label={`Evidence for response ${i + 1}`} disabled={done} />
              </div>
              <div className="builder-row" role="radiogroup" aria-label={`Posture for response ${i + 1}`}>
                <span className="builder-label">Posture</span>
                {(['defend', 'qualify', 'revise'] as Posture[]).map((pt) => (
                  <label key={pt} className={'posture' + (r.posture === pt ? ' on' : '')}>
                    <input type="radio" name={`posture-${c.id}`} checked={r.posture === pt} disabled={done} onChange={() => s.setResponse(c.id, { posture: pt })} />
                    {COPY3.review.postures[pt]}
                  </label>
                ))}
              </div>
              <div className="builder-row col">
                <label className="builder-label" htmlFor={`rat-${c.id}`}>
                  Rationale
                </label>
                <textarea
                  id={`rat-${c.id}`}
                  rows={3}
                  value={r.rationale}
                  disabled={done}
                  placeholder="What in the data supports your response?"
                  onChange={(e) => s.setResponse(c.id, { rationale: e.target.value })}
                />
              </div>
              {r.evidenceQuotationId && (
                <p className="builder-ref">
                  Citing {r.evidenceQuotationId}: “{quotationLabel(p.quotations.find((q) => q.id === r.evidenceQuotationId)!, p.docs).slice(0, 120)}”
                </p>
              )}
            </div>
          </section>
        )
      })}
      {!done && (
        <div className="ica-actions">
          <button className="btn primary" disabled={!ready} onClick={submitResponses}>
            {COPY3.review.submit}
          </button>
        </div>
      )}
    </div>
  )
}
