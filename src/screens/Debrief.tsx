import { useMemo } from 'react'
import { useProject, codeColour, quotationLabel } from '../store/project'
import { useSession, type Sequence } from '../sim/session'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { COPY_END, EXACT_END } from '../content/script'
import { competencyProfile, legacyTiers, namesP4andP7, type Tier } from '../sim/analysis'
import { replayFrom } from '../sim/flow'
import { memoText } from '../sim/gameplay3'
import { TONE_COLOURS } from '../sim/tones'
import { CodeIcon, CodeGroupIcon, QuotationIcon, MemoIcon, ClockIcon } from '../components/icons'

const TIER_COLOUR: Record<Tier, string> = { green: TONE_COLOURS.strong, amber: TONE_COLOURS.developing, red: TONE_COLOURS.weak }
const LEVEL_COLOUR = { Strong: TONE_COLOURS.strong, Developing: TONE_COLOURS.developing, Emerging: TONE_COLOURS.weak }

/** Sequence 5 — the report has left the workspace exactly as submitted; this reveals the analytical trail. */
export function Debrief() {
  const s = useSession()
  const p = useProject()
  const b = s.branchState
  const tiers = legacyTiers({ S1: b.S1, S2: b.S2, S3_route: b.S3_route, S4: b.S4, S5: b.S5 })
  const memoLines = memoText()
  const profile = competencyProfile(
    { S1: b.S1, S2: b.S2, S3_route: b.S3_route, S4: b.S4, S5: b.S5 },
    s.jigsawCompleteness,
    !!b.S5_fieldNotesUsed,
    s.challengeResponses.map((r) => r.quality).filter((q): q is NonNullable<typeof q> => !!q),
    { memoNamesP4P7: namesP4andP7(memoLines.join(' ')), codebookSize: s.codebook.length, reflections: [s.reflections.a, s.reflections.b].filter((x) => x.trim()).length },
  )

  // Evidence lineage: segment → code → category → theme → memo, one row per category.
  const lineage = useMemo(
    () =>
      p.codeGroups.map((g) => {
        const codes = g.memberCodeIds.map((id) => p.codes.find((c) => c.id === id)).filter(Boolean) as typeof p.codes
        const qids = [...new Set(p.codings.filter((c) => g.memberCodeIds.includes(c.codeId)).map((c) => c.quotationId))]
        const quotes = qids.map((id) => p.quotations.find((q) => q.id === id)).filter(Boolean).slice(0, 3) as typeof p.quotations
        return { g, codes, quotes, total: qids.length }
      }),
    [p.codeGroups, p.codes, p.codings, p.quotations],
  )

  const decisions = [
    { label: 'Segmentation', value: b.S1, from: 'Gameplay 1', tier: tiers[0] },
    { label: 'First-pass coding', value: b.S2, from: 'Gameplay 1', tier: tiers[1] },
    { label: 'Reconciliation', value: b.S3_route === 'S3A' ? 'S3A · codebook audit' : b.S3_route === 'S3C' ? 'S3C · coach check-in' : 'S3B · standard', from: 'Gameplay 1', tier: tiers[2] },
    { label: 'Categories', value: `${b.S4} · ${b.S4_categoryCount} categories · ${b.S4_logic} logic`, from: 'Gameplay 2', tier: tiers[3] },
    { label: 'Negative case (P7)', value: b.S5, from: 'Gameplay 2', tier: tiers[4] },
  ]

  const excessWarning = s.flags.includes('fragmented') || s.flags.includes('cannot-generalise')
  const unlocked = !!b.S6_5_unlocked
  const engaged = s.challengeResponses.filter((r) => r.quality === 'engaged').length

  return (
    <div className="debrief">
      <header className="db-head">
        <div className="db-head-inner">
          <p className="db-eyebrow">Sequence 5 · Outcome and debrief</p>
          <h1>{COPY_END.title}</h1>
          <p className="db-sub">
            {s.learnerName} · Lead Coder, Student Wellbeing Access Study
          </p>
          <p className="db-sent">{COPY_END.sent}</p>
        </div>
      </header>

      <main className="db-main">
        <section className="db-section">
          <h2>The theme you submitted</h2>
          <blockquote className="db-theme">{s.theme?.statement ?? s.memo.themeClaim}</blockquote>
          <div className="db-meters">
            <Stat label="Codebook Confidence" v={s.meters.codebookConfidence} />
            <Stat label="Category Coherence" v={s.meters.categoryCoherence} />
            <Stat label="Theme Integrity" v={s.meters.themeIntegrity} />
            <Stat label="Evidence trail" v={s.meters.evidenceTrailCompleteness} />
          </div>
        </section>

        <section className="db-section">
          <h2>Evidence lineage</h2>
          <p className="db-note">Segment → code → category → theme → memo. Gaps stay visible.</p>
          <div className="lineage">
            {lineage.map(({ g, codes, quotes, total }) => (
              <div className="lin-row" key={g.id}>
                <div className="lin-col">
                  <div className="lin-h">Segments ({total})</div>
                  {quotes.length ? (
                    quotes.map((q) => {
                      const d = p.docs.find((x) => x.id === q.docId)
                      return (
                        <div key={q.id} className="lin-q">
                          <QuotationIcon size={12} />
                          {d && <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>{d.participant}</span>}
                          <span>{quotationLabel(q, p.docs).slice(0, 70)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="lin-gap">No coded segments</div>
                  )}
                </div>
                <div className="lin-arrow" aria-hidden="true">→</div>
                <div className="lin-col">
                  <div className="lin-h">Codes</div>
                  {codes.map((c) => (
                    <div key={c.id} className="lin-code" style={{ borderLeftColor: codeColour(c) ?? '#cbd5e1' }}>
                      <CodeIcon size={11} color={codeColour(c)} /> {c.name}
                    </div>
                  ))}
                </div>
                <div className="lin-arrow" aria-hidden="true">→</div>
                <div className="lin-col narrow">
                  <div className="lin-h">Category</div>
                  <div className="lin-cat">
                    <CodeGroupIcon size={13} /> {g.name}
                  </div>
                </div>
                <div className="lin-arrow" aria-hidden="true">→</div>
                <div className="lin-col narrow">
                  <div className="lin-h">Theme</div>
                  <div className="lin-theme">{s.theme?.label ?? '—'}</div>
                </div>
              </div>
            ))}
            {!lineage.length && <p className="lin-gap">No categories were recorded.</p>}
          </div>
          <div className="lin-memo">
            <MemoIcon size={14} /> <strong>Memo</strong>
            {memoLines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </section>

        <section className="db-section">
          <h2>Decisions that shaped the trail</h2>
          <ul className="db-callbacks">
            {decisions.map((d) => (
              <li key={d.label} style={{ borderColor: TIER_COLOUR[d.tier] }}>
                <span className="cb-dot" style={{ background: TIER_COLOUR[d.tier] }} />
                <span className="dbc-label">{d.label}</span>
                <span className="dbc-val">{d.value ?? '—'}</span>
                <span className="cb-from">
                  <ClockIcon size={11} /> from earlier analysis · {d.from}
                </span>
              </li>
            ))}
            <li style={{ borderColor: b.S6_5_unlocked ? TONE_COLOURS.bonus : TONE_COLOURS.neutral }}>
              <span className="cb-dot" style={{ background: b.S6_5_unlocked ? TONE_COLOURS.bonus : TONE_COLOURS.neutral }} />
              <span className="dbc-label">Interpretation</span>
              <span className="dbc-val">
                Trajectory {b.S6_trajectory} · jigsaw {Math.round(s.jigsawCompleteness * 100)}% · peer review {unlocked ? 'unlocked' : 'not unlocked'}
              </span>
              <span className="cb-from">
                <ClockIcon size={11} /> from earlier analysis · Gameplay 3
              </span>
            </li>
          </ul>
        </section>

        {unlocked && (
          <section className="db-section bonus">
            <h2>{EXACT_END.challengeHeading}</h2>
            <p>
              {EXACT_END.challengeIntro} You answered {engaged} of {s.challenges.length} with evidence-led responses
              {s.challengeResponses.length ? ` (${s.challengeResponses.map((r) => `${r.challengeId}: ${r.posture ?? '—'}, ${r.quality}`).join('; ')})` : ''}. {EXACT_END.challengeOutro}
            </p>
            <ul className="db-challenges">
              {s.challenges.map((c) => {
                const r = s.challengeResponses.find((x) => x.challengeId === c.id)
                return (
                  <li key={c.id}>
                    <blockquote>{c.text}</blockquote>
                    <p>
                      <strong>Your response ({r?.posture ?? '—'}):</strong> {r?.rationale || '—'}
                    </p>
                    <p className="muted">
                      {r?.quality === 'engaged'
                        ? 'Evidence-led: you went back to the data.'
                        : r?.quality === 'capitulated'
                          ? 'You revised without citing data — a good-faith challenge deserves a check against the evidence before conceding.'
                          : r?.quality === 'dismissed'
                            ? 'You defended without citing data — a defence carries weight only when it points at the excerpt.'
                            : 'The response needed more evidence to carry its posture.'}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="db-section">
          <h2>Competency profile</h2>
          <p className="db-note">A self-check, not a score. Bonus and remedial routes add evidence, never extra ceiling.</p>
          <table className="db-profile">
            <tbody>
              {profile.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>
                    {row.level ? (
                      <span className="lvl" style={{ background: LEVEL_COLOUR[row.level] }}>
                        {row.level}
                      </span>
                    ) : (
                      <span className="lvl q">Evidence on record</span>
                    )}
                  </td>
                  <td className="db-ev">
                    <span className="muted">{row.inputs}</span>
                    <br />
                    {row.evidence.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="db-section">
          <h2>Reflection</h2>
          <label className="db-reflect">
            <span>{excessWarning ? EXACT_END.reflectExcess : COPY_END.reflectGeneral}</span>
            <textarea rows={3} value={s.reflections.a} onChange={(e) => s.patch({ reflections: { ...s.reflections, a: e.target.value } })} />
          </label>
          <label className="db-reflect">
            <span>{unlocked ? COPY_END.reflectUnlocked : COPY_END.reflectGate}</span>
            {!unlocked && (
              <span className="db-gate">
                Recorded: reconciliation {b.S3_route ?? '—'} · negative case {b.S5 ?? '—'} · trajectory {b.S6_trajectory ?? '—'} · jigsaw{' '}
                {Math.round(s.jigsawCompleteness * 100)}% · memo {namesP4andP7(memoLines.join(' ')) ? 'names P4 and P7' : 'does not name both P4 and P7'}
              </span>
            )}
            <textarea rows={3} value={s.reflections.b} onChange={(e) => s.patch({ reflections: { ...s.reflections, b: e.target.value } })} />
          </label>
        </section>

        <section className="db-section">
          <h2>Replay</h2>
          <p className="db-note">Start again from a major gameplay sequence. Your current run stays on record in the audit trail.</p>
          <div className="db-replay">
            {(['GP1', 'GP2', 'GP3'] as Sequence[]).map((k, i) => (
              <button key={k} className="btn" disabled={!s.checkpoints[k]} onClick={() => replayFrom(k)}>
                Replay Gameplay {i + 1}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number | null }) {
  const col = v === null ? TONE_COLOURS.neutral : v > 75 ? TONE_COLOURS.strong : v >= 40 ? TONE_COLOURS.developing : TONE_COLOURS.weak
  return (
    <div className="db-stat">
      <span className="db-stat-v" style={{ color: col }}>
        {v === null ? '—' : `${v}%`}
      </span>
      <span className="db-stat-l">{label}</span>
    </div>
  )
}
