import { useEffect, useMemo, useRef, useState } from 'react'
import { useProject, codeColour, groundedness, quotationLabel } from '../store/project'
import { useUI } from '../store/ui'
import { PRODUCT_NAME } from '../config'
import { useSession } from '../sim/session'
import { FacilitatorView } from '../sim/FacilitatorView'
import { CodeIcon, QuotationIcon } from './icons'
import * as I from './icons'

/** ATLAS.ti "coding dialogue": search, apply existing codes, or create a new one. */
export function ApplyCodesDialog() {
  const p = useProject()
  const ui = useUI()
  const [q, setQ] = useState('')
  const [view, setView] = useState<'all' | 'applied'>('all')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const pos = ui.applyCodes

  // The target is either the pending text selection or the selected quotation.
  const targetQ = p.selected?.kind === 'quotation' ? p.quotations.find((x) => x.id === (p.selected as { id: string }).id) : undefined
  const doc = p.docs.find((d) => d.id === (p.selection?.docId ?? targetQ?.docId))
  const appliedIds = targetQ && !p.selection ? p.codings.filter((c) => c.quotationId === targetQ.id).map((c) => c.codeId) : []

  const list = useMemo(() => {
    const f = q.trim().toLowerCase()
    return p.codes
      .filter((c) => (view === 'applied' ? appliedIds.includes(c.id) : true))
      .filter((c) => !f || c.name.toLowerCase().includes(f))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [p.codes, q, view, appliedIds])

  useEffect(() => {
    if (!pos) return
    setQ('')
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.closeApplyCodes()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  if (!pos) return null
  if (!p.selection && !targetQ) return null

  const header = p.selection
    ? `New quotation in D${doc?.id}: ${doc?.name ?? ''}`
    : `${targetQ!.id} in D${doc?.id}: ${doc?.name ?? ''}`

  const apply = (codeId: string) => {
    p.codeSelection(codeId)
    setQ('')
    // stay in the field so several codes can be applied in a row, as in ATLAS.ti
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const createAndApply = () => {
    const name = q.trim()
    if (!name) return
    apply(p.createCode(name).id)
  }
  const exact = list.find((c) => c.name.toLowerCase() === q.trim().toLowerCase())

  return (
    <div
      className="apply-codes"
      role="dialog"
      aria-label="Apply codes"
      style={{ left: Math.max(8, pos.x), top: Math.min(pos.y, window.innerHeight - 380) }}
    >
      <div className="ac-head">
        <QuotationIcon size={18} />
        <span className="ac-title" title={header}>
          {header}
        </span>
        <button className="ac-close" onClick={ui.closeApplyCodes} aria-label="Close">
          <I.CloseIcon size={14} />
        </button>
      </div>
      <div className="ac-toggle" role="tablist">
        <button role="tab" aria-selected={view === 'all'} className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
          All Codes
        </button>
        <button role="tab" aria-selected={view === 'applied'} className={view === 'applied' ? 'on' : ''} onClick={() => setView('applied')}>
          Applied Codes
        </button>
      </div>
      <div className="ac-search">
        <div className="ac-input">
          <input
            ref={inputRef}
            value={q}
            placeholder="Search or enter a new code name"
            aria-label="Code name"
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, list.length - 1))
              if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
              if (e.key === 'Enter') {
                e.preventDefault()
                if (exact) apply(exact.id)
                else if (q.trim()) createAndApply()
                else if (list[active]) apply(list[active].id)
              }
            }}
          />
          {q && (
            <button className="ac-clear" onClick={() => setQ('')} aria-label="Clear search">
              <I.CloseIcon size={14} />
            </button>
          )}
        </div>
        <button className="ac-plus" onClick={createAndApply} disabled={!q.trim() || !!exact} title="Create code and apply" aria-label="Create code and apply">
          +
        </button>
      </div>
      <ul className="ac-list" role="listbox">
        {list.length === 0 && <li className="ac-empty">{q.trim() ? `Press Enter to create “${q.trim()}”` : 'No codes yet. Type a name to create one.'}</li>}
        {list.map((c, i) => {
          const applied = appliedIds.includes(c.id)
          return (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              className={'ac-item' + (i === active ? ' active' : '')}
              onMouseEnter={() => setActive(i)}
              onDoubleClick={() => apply(c.id)}
            >
              <span className="code-dot" style={{ background: codeColour(c) ?? 'transparent', borderColor: codeColour(c) ?? '#bbb' }} />
              <CodeIcon size={14} color={codeColour(c)} />
              <span className="ac-name">{c.name}</span>
              {applied ? (
                <button className="ac-row-btn" title="Remove from quotation" onClick={() => targetQ && p.unlinkCode(targetQ.id, c.id)}>
                  −
                </button>
              ) : (
                <button className="ac-row-btn" title="Apply code" onClick={() => apply(c.id)}>
                  +
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ContextMenu() {
  const { contextMenu, closeContextMenu } = useUI()
  useEffect(() => {
    if (!contextMenu) return
    const close = () => closeContextMenu()
    window.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
    }
  }, [contextMenu, closeContextMenu])
  if (!contextMenu) return null
  return (
    <ul
      className="ctx-menu"
      role="menu"
      style={{ left: Math.min(contextMenu.x, window.innerWidth - 260), top: Math.min(contextMenu.y, window.innerHeight - 240) }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {contextMenu.items.map((it, i) =>
        it.separator ? (
          <li key={i} className="ctx-sep" role="separator" />
        ) : (
          <li key={i} role="none">
            <button
              role="menuitem"
              disabled={it.disabled}
              className={it.danger ? 'danger' : undefined}
              onClick={() => {
                closeContextMenu()
                it.onClick?.()
              }}
            >
              <span>{it.label}</span>
              {it.shortcut && <span className="ctx-short">{it.shortcut}</span>}
            </button>
          </li>
        ),
      )}
    </ul>
  )
}

/** ATLAS.ti Merge Codes: pick the codes to merge into the selected target and preview the result. */
export function MergeCodesDialog() {
  const p = useProject()
  const ui = useUI()
  const d = ui.mergeDialog
  const [picked, setPicked] = useState<string[]>([])
  useEffect(() => setPicked(d?.sourceIds ?? []), [d])
  if (!d?.targetId) return null
  const target = p.codes.find((c) => c.id === d.targetId)
  if (!target) return null
  const others = p.codes.filter((c) => c.id !== target.id).sort((a, b) => a.name.localeCompare(b.name))
  const mergedQuotes = new Set(p.codings.filter((c) => c.codeId === target.id || picked.includes(c.codeId)).map((c) => c.quotationId))

  return (
    <div className="modal-backdrop" onMouseDown={ui.closeMerge}>
      <div className="modal merge" role="dialog" aria-label="Merge codes" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Merge Codes</div>
        <div className="modal-body">
          <p className="muted">
            Select the codes to merge into <strong>{target.name}</strong>. Their quotations and comments move to the target code.
          </p>
          <div className="merge-cols">
            <ul className="merge-list" aria-label="Codes to merge">
              {others.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={picked.includes(c.id)}
                      onChange={(e) => setPicked((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                    />
                    <CodeIcon size={13} color={codeColour(c)} /> {c.name}{' '}
                    <span className="tree-count">({groundedness(c.id, p.codings)})</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="merge-preview" aria-live="polite">
              <div className="merge-preview-title">Preview</div>
              <div className="merge-target">
                <CodeIcon size={14} color={codeColour(target)} /> {target.name}
                <span className="tree-count"> ({mergedQuotes.size})</span>
              </div>
              <ul className="merge-quotes">
                {[...mergedQuotes].map((qid) => {
                  const q = p.quotations.find((x) => x.id === qid)
                  return q ? (
                    <li key={qid}>
                      <QuotationIcon size={12} /> {qid} {quotationLabel(q, p.docs).slice(0, 70)}
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={ui.closeMerge}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!picked.length}
            onClick={() => {
              p.mergeCodes(target.id, picked)
              ui.closeMerge()
              ui.showToast(`Merged ${picked.length} code${picked.length > 1 ? 's' : ''} into “${target.name}”`)
            }}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  )
}

export function Backstage() {
  const ui = useUI()
  const p = useProject()
  const [page, setPage] = useState<'overview' | 'facilitator'>('overview')
  if (!ui.backstageOpen) return null
  return (
    <div className="backstage" role="dialog" aria-label="File">
      <nav className="bs-nav">
        <button className="bs-back" onClick={() => ui.setBackstage(false)} aria-label="Back">
          ←
        </button>
        <button className={'bs-item' + (page === 'overview' ? ' active' : '')} onClick={() => setPage('overview')}>
          Project Overview
        </button>
        <button className="bs-item" disabled>New</button>
        <button className="bs-item" disabled>Open</button>
        <button className="bs-item" disabled>Save As</button>
        <button className="bs-item" disabled>Snapshot</button>
        <button className="bs-item" disabled>Export</button>
        <div className="bs-sep" />
        <button className={'bs-item' + (page === 'facilitator' ? ' active' : '')} onClick={() => setPage('facilitator')}>
          Facilitator view
        </button>
        <label className="bs-item bs-toggle">
          <input type="checkbox" checked={!ui.focusMode} onChange={(e) => ui.setFocusMode(!e.target.checked)} />
          Show classic layout
        </label>
        <button
          className="bs-item"
          onClick={() => {
            if (window.confirm('Restart the simulation? Your name, quotations and codes will be cleared.')) {
              p.resetProject()
              useSession.getState().restart()
              ui.setBackstage(false)
            }
          }}
        >
          Restart simulation
        </button>
      </nav>
      {page === 'facilitator' ? (
        <div className="bs-content wide">
          <FacilitatorView />
        </div>
      ) : (
      <div className="bs-content">
        <h1>{p.projectName}</h1>
        <dl className="bs-facts">
          <dt>Documents</dt>
          <dd>{p.docs.length}</dd>
          <dt>Quotations</dt>
          <dd>{p.quotations.length}</dd>
          <dt>Codes</dt>
          <dd>{p.codes.length}</dd>
          <dt>Current user</dt>
          <dd>{p.currentUser}</dd>
          <dt>Application</dt>
          <dd>{PRODUCT_NAME}</dd>
        </dl>
      </div>
      )}
    </div>
  )
}

export function Toast() {
  const t = useUI((s) => s.toast)
  return t ? (
    <div className="toast" role="status">
      {t}
    </div>
  ) : null
}
