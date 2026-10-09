import { useProject } from '../store/project'
import { useSession } from './session'
import { memoText } from './gameplay3'

/** Facilitator view (storyboard §8): learner path, flags, meters, artifacts, memo, peer review, replay points. */
export function FacilitatorView() {
  const s = useSession()
  const p = useProject()

  const exportJson = () => {
    const { checkpoints, ...session } = JSON.parse(JSON.stringify(s))
    const payload = {
      exportedAt: new Date().toISOString(),
      learner: { learnerId: s.learnerId, learnerName: s.learnerName },
      session,
      replayPoints: Object.fromEntries(Object.entries(checkpoints as Record<string, { at: number }>).map(([k, v]) => [k, new Date(v.at).toISOString()])),
      project: {
        quotations: p.quotations,
        codes: p.codes,
        codings: p.codings,
        codeGroups: p.codeGroups,
        networks: p.networks,
        memos: p.memos,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qcs-${s.learnerId ?? 'learner'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const b = s.branchState
  return (
    <div className="fac">
      <div className="fac-head">
        <h1>Facilitator view</h1>
        <button className="btn primary" onClick={exportJson}>
          Export learner record (JSON)
        </button>
      </div>
      <div className="fac-grid">
        <section>
          <h3>Learner path</h3>
          <dl>
            <dt>Learner</dt>
            <dd>
              {s.learnerName} <span className="muted">({s.learnerId})</span>
            </dd>
            <dt>Scenes</dt>
            <dd>{s.sceneHistory.join(' → ') || '—'}</dd>
            <dt>Sequence</dt>
            <dd>
              {s.sequence} · GP1 {s.gp1Phase} · GP2 {s.gp2Phase} · GP3 {s.gp3Phase}
            </dd>
            <dt>Complete</dt>
            <dd>{s.simulationComplete ? 'Yes' : 'No'}</dd>
          </dl>
        </section>
        <section>
          <h3>Branch state</h3>
          <dl>
            {Object.entries(b).map(([k, v]) => (
              <div key={k} className="fac-kv">
                <dt>{k}</dt>
                <dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Meters &amp; flags</h3>
          <dl>
            <dt>Codebook Confidence</dt>
            <dd>{s.meters.codebookConfidence ?? '—'}</dd>
            <dt>Category Coherence</dt>
            <dd>{s.meters.categoryCoherence ?? '—'}</dd>
            <dt>Theme Integrity</dt>
            <dd>{s.meters.themeIntegrity ?? '—'}</dd>
            <dt>Evidence trail</dt>
            <dd>{s.meters.evidenceTrailCompleteness}%</dd>
            <dt>Flags</dt>
            <dd>{s.flags.join(', ') || '—'}</dd>
            <dt>Field notes</dt>
            <dd>
              {s.earlyFieldNotePreview ? 'Early preview found · ' : ''}
              {b.S5_fieldNotesUsed ? 'linked to theme' : 'not linked'}
            </dd>
            <dt>Unlocked</dt>
            <dd>{s.unlockedContent.join(', ')}</dd>
          </dl>
        </section>
        <section>
          <h3>Codebook ({s.codebook.length})</h3>
          <ul className="fac-list">
            {s.codebook.map((c) => (
              <li key={c.codeId}>
                {c.label} <span className="muted">({c.excerptRefs.length})</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Categories</h3>
          <ul className="fac-list">
            {s.categories.map((c) => (
              <li key={c.id}>
                {c.name} <span className="muted">· {c.memberCodeIds.length} codes · coherence {Math.round(c.coherenceScore * 100)}%</span>
              </li>
            ))}
          </ul>
          <h3>Theme</h3>
          <p>{s.theme ? `${s.theme.label} — ${s.theme.statement}` : '—'}</p>
          <p className="muted">Ranking: {s.themeRanking.join(' > ') || '—'}</p>
        </section>
        <section>
          <h3>Memo ({s.memoStatus})</h3>
          {memoText().map((l, i) => (
            <p key={i} className="fac-memo">
              {l}
            </p>
          ))}
        </section>
        <section>
          <h3>Peer review</h3>
          {s.challenges.length ? (
            <ul className="fac-list">
              {s.challenges.map((c) => {
                const r = s.challengeResponses.find((x) => x.challengeId === c.id)
                return (
                  <li key={c.id}>
                    <em>{c.text}</em>
                    <br />
                    {r?.posture ?? '—'} · {r?.quality ?? '—'} · {r?.rationale}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">Not unlocked.</p>
          )}
          <h3>Replay points</h3>
          <ul className="fac-list">
            {Object.entries(s.checkpoints).map(([k, v]) => (
              <li key={k}>
                {k} · {new Date(v!.at).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
        <section className="wide">
          <h3>Analysis audit trail</h3>
          <ol className="fac-audit">
            {s.audit.map((a, i) => (
              <li key={i}>
                <span className="muted">{new Date(a.t).toLocaleTimeString()}</span> <strong>{a.kind}</strong> {a.detail}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
