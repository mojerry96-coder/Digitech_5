import { useState } from 'react'
import {
  useProject,
  codeColour,
  groundedness,
  quotationLabel,
  CODE_TYPE_LABELS,
  type CodeType,
} from '../store/project'
import { useUI } from '../store/ui'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { PRODUCT_NAME } from '../config'
import { useSession } from '../sim/session'
import { EXACT } from '../content/script'
import { useEffect, useRef } from 'react'
import * as I from './icons'

const CODE_MIME = 'application/x-qcs-code'

export function CodeManager() {
  const p = useProject()
  const ui = useUI()
  const [filter, setFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<'name' | 'grounded'>('name')
  const f = filter.trim().toLowerCase()
  const group = p.codeGroups.find((g) => g.id === groupFilter)

  const rows = p.codes
    .filter((c) => !f || c.name.toLowerCase().includes(f))
    .filter((c) => !group || group.memberCodeIds.includes(c.id))
    .map((c) => ({ c, g: groundedness(c.id, p.codings) }))
    .sort((a, b) => (sort === 'name' ? a.c.name.localeCompare(b.c.name) : b.g - a.g))
  const maxG = Math.max(1, ...rows.map((r) => r.g))
  const selectedCode = p.selected?.kind === 'code' ? p.selected.id : null
  const fragmentedWarning = useSession((s) => s.flags.includes('fragmented') && s.gp1Phase === 'B')

  return (
    <div className="manager code-manager">
      <div className="cm-groups" aria-label="Code Groups">
        <div className="search-box small">
          <input placeholder="Search Code Groups" aria-label="Search code groups" />
          <I.SearchGlyph />
        </div>
        <div className="cm-groups-title">Code Groups</div>
        <ul>
          <li className={!groupFilter ? 'selected' : ''} onClick={() => setGroupFilter(null)}>
            <I.CodeGroupIcon size={14} /> All codes <span className="tree-count">({p.codes.length})</span>
          </li>
          {p.codeGroups.map((g) => (
            <li key={g.id} className={groupFilter === g.id ? 'selected' : ''} onClick={() => setGroupFilter(g.id)}>
              <I.CodeGroupIcon size={14} /> {g.name} <span className="tree-count">({g.memberCodeIds.length})</span>
            </li>
          ))}
          {!p.codeGroups.length && <li className="muted small-note">No code groups yet</li>}
        </ul>
      </div>
      <div className="cm-main">
        <div className="search-box small">
          <input placeholder="Search Entities" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search codes" />
          <I.SearchGlyph />
        </div>
        {fragmentedWarning && (
          <div className="warn-bar weak" role="alert">
            <strong>{EXACT.signalLost}</strong> · {p.codes.filter((c) => c.suggested).length} near-duplicate micro-codes in the codebook preview
          </div>
        )}
        {group && (
          <div className="filter-bar">
            Show codes in group <strong>{group.name}</strong>
            <button onClick={() => setGroupFilter(null)} aria-label="Clear group filter">
              <I.CloseIcon size={14} />
            </button>
          </div>
        )}
        <div className="table-scroll">
          <table className="grid" aria-label="Codes">
            <thead>
              <tr>
                <th onClick={() => setSort('name')} className="sortable">
                  Name
                </th>
                <th onClick={() => setSort('grounded')} className="sortable num">
                  Grounded
                </th>
                <th className="num">Density</th>
                <th>Type</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, g }) => (
                <tr
                  key={c.id}
                  className={(selectedCode === c.id ? 'selected' : '') + (c.suggested ? ' suggested' : '')}
                  onClick={() => p.select({ kind: 'code', id: c.id })}
                  onDoubleClick={() => ui.setRenameCode(c.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(CODE_MIME, c.id)
                    e.dataTransfer.effectAllowed = 'link'
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    p.select({ kind: 'code', id: c.id })
                    ui.openContextMenu(e.clientX, e.clientY, [
                      { label: 'Rename', onClick: () => ui.setRenameCode(c.id) },
                      { label: 'Merge Codes…', disabled: p.codes.length < 2, onClick: () => ui.openMerge({ targetId: c.id, sourceIds: [] }) },
                      { separator: true, label: '' },
                      { label: 'Delete', danger: true, onClick: () => p.deleteCode(c.id) },
                    ])
                  }}
                >
                  <td className="name-cell">
                    <span className="code-dot" style={{ background: codeColour(c) ?? 'transparent', borderColor: codeColour(c) ?? '#bbb' }} />
                    <I.CodeIcon size={14} color={codeColour(c)} />
                    {ui.renameCode === c.id ? (
                      <input
                        className="inline-edit"
                        autoFocus
                        defaultValue={c.name}
                        aria-label="Code name"
                        onBlur={(e) => {
                          if (e.target.value.trim()) p.renameCode(c.id, e.target.value.trim())
                          ui.setRenameCode(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') ui.setRenameCode(null)
                        }}
                      />
                    ) : (
                      <span>{c.name}</span>
                    )}
                    {c.suggested && <span className="sugg-chip">suggested</span>}
                  </td>
                  <td className="num">
                    <span className="gbar">
                      <span style={{ width: `${(g / maxG) * 100}%` }} />
                    </span>
                    {g}
                  </td>
                  <td className="num">0</td>
                  <td>
                    <select
                      className="type-select"
                      value={c.type ?? ''}
                      aria-label={`Code type for ${c.name}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => p.setCodeType(c.id, (e.target.value || undefined) as CodeType | undefined)}
                    >
                      <option value="">—</option>
                      {(Object.keys(CODE_TYPE_LABELS) as CodeType[]).map((t) => (
                        <option key={t} value={t}>
                          {CODE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="comment-cell">{c.comment}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {p.codes.length ? 'No codes match.' : 'No codes yet. Highlight text in a document and choose Apply Codes.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function DocumentManager() {
  const p = useProject()
  return (
    <div className="manager">
      <div className="table-scroll">
        <table className="grid" aria-label="Documents">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Participant</th>
              <th className="num">Quotations</th>
              <th>Document Groups</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {p.docs.map((d) => (
              <tr
                key={d.id}
                className={p.selected?.kind === 'document' && p.selected.id === d.id ? 'selected' : ''}
                onClick={() => p.select({ kind: 'document', id: d.id })}
                onDoubleClick={() => p.openTab({ kind: 'document', id: d.id }, 0)}
              >
                <td>D{d.id}</td>
                <td className="name-cell">
                  <I.DocIcon size={14} /> {d.name}
                </td>
                <td>
                  <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>
                    {d.participant}
                  </span>
                </td>
                <td className="num">{p.quotations.filter((q) => q.docId === d.id).length}</td>
                <td>{d.groups.join(', ')}</td>
                <td>{d.draft ? <span className="draft-chip">DRAFT</span> : 'Source text'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function QuotationManager() {
  const p = useProject()
  return (
    <div className="manager">
      <div className="table-scroll">
        <table className="grid" aria-label="Quotations">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Document</th>
              <th>Codes</th>
              <th>Created by</th>
            </tr>
          </thead>
          <tbody>
            {p.quotations.map((q) => {
              const d = p.docs.find((x) => x.id === q.docId)
              const codes = p.codings
                .filter((c) => c.quotationId === q.id)
                .map((c) => p.codes.find((x) => x.id === c.codeId)?.name)
                .filter(Boolean)
              return (
                <tr
                  key={q.id}
                  className={p.selected?.kind === 'quotation' && p.selected.id === q.id ? 'selected' : ''}
                  onClick={() => p.select({ kind: 'quotation', id: q.id })}
                  onDoubleClick={() => {
                    p.openTab({ kind: 'document', id: q.docId }, 0)
                    p.select({ kind: 'quotation', id: q.id })
                  }}
                >
                  <td>{q.id}</td>
                  <td className="name-cell">
                    <I.QuotationIcon size={14} /> {quotationLabel(q, p.docs).slice(0, 80)}
                  </td>
                  <td>D{d?.id}</td>
                  <td>{codes.join('; ')}</td>
                  <td>{q.createdBy}</td>
                </tr>
              )
            })}
            {!p.quotations.length && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No quotations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ProjectOverview() {
  const p = useProject()
  const rows: [React.ReactNode, string, number, () => void][] = [
    [<I.DocIcon size={16} />, 'Documents', p.docs.length, () => p.openTab({ kind: 'documentManager' })],
    [<I.CodeIcon size={16} />, 'Codes', p.codes.length, () => p.openTab({ kind: 'codeManager' }, 1)],
    [<I.QuotationIcon size={16} />, 'Quotations', p.quotations.length, () => p.openTab({ kind: 'quotationManager' })],
    [<I.MemoIcon size={16} />, 'Memos', p.memos.length, () => {}],
    [<I.NetworkIcon size={16} />, 'Networks', 0, () => {}],
  ]
  return (
    <div className="overview">
      <h1 className="overview-title">{p.projectName}</h1>
      <p className="overview-desc">
        Interviews with undergraduate students about why they do — or do not — use the campus mental health and wellbeing service. Report due to
        the Dean of Students in two weeks.
      </p>
      <p className="overview-edit">Click to edit comment</p>
      <div className="overview-section">Project Overview</div>
      <div className="overview-grid">
        <ul className="overview-rows">
          {rows.map(([icon, label, n, open]) => (
            <li key={label}>
              <button onClick={open}>
                {icon}
                <span>{label}</span>
                <span className="overview-n">{n}</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="overview-facts">
          <li>
            <I.PencilLineIcon size={15} /> Created by Lead Researcher
          </li>
          <li>
            <I.ClockIcon size={15} /> Last modified today
          </li>
          <li>
            <I.UserIcon size={15} /> Current user {p.currentUser}
          </li>
          <li>
            <I.InfoIcon size={15} /> {PRODUCT_NAME}
          </li>
        </ul>
      </div>
    </div>
  )
}

/** Hidden, non-scoring discovery: highlighting a field-note phrase before Scene 3 (storyboard S1 bonus). */
function useFieldNotePreview(enabled: boolean) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<number>()
  useEffect(() => () => clearTimeout(timer.current), [])
  const onMouseUp = () => {
    if (!enabled) return
    const s = useSession.getState()
    if (s.earlyFieldNotePreview || !(s.gp1Phase === 'A' || s.gp1Phase === 'B')) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return
    const r = sel.getRangeAt(0).getBoundingClientRect()
    setTip({ x: r.left, y: r.bottom + 8 })
    s.patch({ earlyFieldNotePreview: true })
    s.log('bonus', 'Early field-note preview triggered')
    timer.current = window.setTimeout(() => setTip(null), 6000)
  }
  const node = tip ? (
    <div className="fn-tip" role="status" style={{ left: tip.x, top: tip.y }} onClick={() => setTip(null)}>
      {EXACT.fieldNotePreview}
    </div>
  ) : null
  return { onMouseUp, node }
}

export function MemoViewer({ memoId }: { memoId: string }) {
  const m = useProject((s) => s.memos.find((x) => x.id === memoId))
  const preview = useFieldNotePreview(m?.type === 'Field note')
  if (!m) return <div className="empty-view">Memo not found.</div>
  return (
    <div className="doc-view">
      {m.draft && (
        <div className="info-bar" role="note">
          <strong>DRAFT</strong> placeholder field note. Replace with authored source content before sign-off.
        </div>
      )}
      {preview.node}
      <div className="memo-view" onMouseUp={preview.onMouseUp}>
        <div className="memo-meta">
          {m.type === 'Handoff' ? <I.CommentIcon size={18} /> : <I.FieldNoteIcon size={18} />} <strong>{m.title}</strong> <span className="muted">· Type: {m.type}</span>
        </div>
        {m.text.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
    </div>
  )
}
