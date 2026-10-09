import { useMemo, useState } from 'react'
import { useProject, codeColour, groundedness, CODE_TYPE_LABELS, CODE_TYPE_COLOURS, type CodeType } from '../store/project'
import { useUI } from '../store/ui'
import { useSession } from './session'
import { CaseBody, CasePanel } from './CasePanel'
import { CodeIcon, NewCodeIcon, SearchGlyph, CloseIcon } from '../components/icons'

const CODE_MIME = 'application/x-qcs-code'

/** Compact Code Manager for the focus-mode rail: search, drag to code, rename, type, merge, delete. */
function CodeList() {
  const p = useProject()
  const ui = useUI()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const f = q.trim().toLowerCase()
  const g = p.codeGroups.find((x) => x.id === group)
  const rows = useMemo(
    () =>
      p.codes
        .filter((c) => !f || c.name.toLowerCase().includes(f))
        .filter((c) => !g || g.memberCodeIds.includes(c.id))
        .map((c) => ({ c, n: groundedness(c.id, p.codings) }))
        .sort((a, b) => Number(!!a.c.suggested) - Number(!!b.c.suggested) || a.c.name.localeCompare(b.c.name)),
    [p.codes, p.codings, f, g],
  )
  const fragmented = useSession((s) => s.flags.includes('fragmented') && s.gp1Phase === 'B')
  const selected = p.selected?.kind === 'code' ? p.selected.id : null

  return (
    <div className="codelist">
      <div className="cl-top">
        <div className="cl-search">
          <SearchGlyph size={14} />
          <input placeholder="Search codes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search codes" />
        </div>
        <button className="icon-btn" title="New code" aria-label="New code" onClick={() => setAdding(true)}>
          <NewCodeIcon size={16} />
        </button>
      </div>
      {adding && (
        <form
          className="cl-new"
          onSubmit={(e) => {
            e.preventDefault()
            const name = (new FormData(e.currentTarget).get('name') as string)?.trim()
            if (name) p.select({ kind: 'code', id: p.createCode(name).id })
            setAdding(false)
          }}
        >
          <input name="name" autoFocus placeholder="New code name" aria-label="New code name" onBlur={() => setAdding(false)} />
        </form>
      )}
      {p.codeGroups.length > 0 && (
        <div className="cl-groups" role="tablist" aria-label="Code groups">
          <button className={'chip' + (!group ? ' on' : '')} onClick={() => setGroup(null)}>
            All
          </button>
          {p.codeGroups.map((x) => (
            <button key={x.id} className={'chip' + (group === x.id ? ' on' : '')} onClick={() => setGroup(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      )}
      {fragmented && <div className="cl-warn">Signal lost in noise · many near-duplicate suggestions</div>}
      <ul className="cl-list" aria-label="Codes">
        {rows.map(({ c, n }) => (
          <li
            key={c.id}
            className={'cl-row' + (selected === c.id ? ' sel' : '') + (c.suggested ? ' sugg' : '')}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(CODE_MIME, c.id)
              e.dataTransfer.effectAllowed = 'link'
            }}
            onClick={() => p.select({ kind: 'code', id: c.id })}
            onDoubleClick={() => ui.setRenameCode(c.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              p.select({ kind: 'code', id: c.id })
              ui.openContextMenu(e.clientX, e.clientY, [
                { label: 'Rename', onClick: () => ui.setRenameCode(c.id) },
                ...(Object.keys(CODE_TYPE_LABELS) as CodeType[]).map((t) => ({
                  label: `Type: ${CODE_TYPE_LABELS[t]}${c.type === t ? '  ✓' : ''}`,
                  onClick: () => p.setCodeType(c.id, c.type === t ? undefined : t),
                })),
                { separator: true, label: '' },
                { label: 'Merge into this code…', disabled: p.codes.length < 2, onClick: () => ui.openMerge({ targetId: c.id, sourceIds: [] }) },
                { label: 'Delete', danger: true, onClick: () => p.deleteCode(c.id) },
              ])
            }}
            tabIndex={0}
            aria-label={`${c.name}, ${n} quotations`}
          >
            <span className="cl-dot" style={{ background: codeColour(c) ?? 'transparent', borderColor: codeColour(c) ?? '#CBD5E1' }} />
            <CodeIcon size={15} color={codeColour(c)} />
            {ui.renameCode === c.id ? (
              <input
                className="inline-edit"
                autoFocus
                defaultValue={c.name}
                aria-label="Code name"
                onClick={(e) => e.stopPropagation()}
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
              <span className="cl-name">{c.name}</span>
            )}
            {c.suggested ? <span className="cl-sugg">suggested</span> : <span className="cl-n">{n}</span>}
          </li>
        ))}
        {!rows.length && <li className="cl-empty">{p.codes.length ? 'No codes match.' : 'No codes yet. Select text and choose Apply code.'}</li>}
      </ul>
      <div className="cl-legend">
        {(Object.keys(CODE_TYPE_COLOURS) as CodeType[]).map((t) => (
          <span key={t}>
            <i style={{ background: CODE_TYPE_COLOURS[t] }} /> {CODE_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
      <p className="cl-hint">Drag a code onto selected text, or right-click a code to rename, set its type or merge.</p>
    </div>
  )
}

/** Focus mode: one right rail (Task | Codes) instead of a Case panel plus a Code Manager column. */
export function Rail() {
  const ui = useUI()
  const [hidden, setHidden] = useState(false)
  const hasNews = useSession((s) => !!s.consequence)
  if (!ui.focusMode) return <CasePanel />
  if (hidden)
    return (
      <aside className="rail collapsed" aria-label="Task and codes">
        <button className="rail-open" onClick={() => setHidden(false)} aria-label="Show task and codes">
          Task
        </button>
      </aside>
    )
  return (
    <aside className="rail" aria-label="Task and codes">
      <div className="rail-tabs" role="tablist">
        <button role="tab" aria-selected={ui.rail === 'task'} className={ui.rail === 'task' ? 'on' : ''} onClick={() => ui.setRail('task')}>
          Task {hasNews && ui.rail !== 'task' && <span className="rail-dot" aria-label="new feedback" />}
        </button>
        <button role="tab" aria-selected={ui.rail === 'codes'} className={ui.rail === 'codes' ? 'on' : ''} onClick={() => ui.setRail('codes')}>
          Codes
        </button>
        <button className="icon-btn rail-hide" onClick={() => setHidden(true)} aria-label="Hide panel" title="Hide panel">
          <CloseIcon size={14} />
        </button>
      </div>
      {ui.rail === 'task' ? <CaseBody /> : <CodeList />}
    </aside>
  )
}
