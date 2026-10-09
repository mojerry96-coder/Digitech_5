import { useState, type ReactNode } from 'react'
import { useProject, codeColour, groundedness, quotationLabel } from '../store/project'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { useUI } from '../store/ui'
import * as I from './icons'

function Branch({
  icon,
  label,
  count,
  children,
  defaultOpen = false,
}: {
  icon: ReactNode
  label: string
  count?: number
  children?: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const expandable = !!children
  return (
    <li role="treeitem" aria-expanded={expandable ? open : undefined}>
      <div
        className="tree-row"
        tabIndex={0}
        onClick={() => expandable && setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setOpen(true)
          if (e.key === 'ArrowLeft') setOpen(false)
          if (e.key === 'Enter') setOpen(!open)
        }}
      >
        <span className={'tree-twisty' + (expandable ? '' : ' empty')}>
          {expandable && (open ? <I.ChevronDown size={9} /> : <I.ChevronRight size={9} />)}
        </span>
        {icon}
        <span className="tree-label">
          {label}
          {count !== undefined && <span className="tree-count"> ({count})</span>}
        </span>
      </div>
      {expandable && open && <ul role="group">{children}</ul>}
    </li>
  )
}

function Leaf({
  icon,
  label,
  onOpen,
  onSelect,
  selected,
  draggableCode,
  badge,
}: {
  icon: ReactNode
  label: ReactNode
  onOpen?: () => void
  onSelect?: () => void
  selected?: boolean
  draggableCode?: string
  badge?: ReactNode
}) {
  return (
    <li role="treeitem" aria-selected={selected}>
      <div
        className={'tree-row leaf' + (selected ? ' selected' : '')}
        tabIndex={0}
        draggable={!!draggableCode}
        onDragStart={(e) => {
          if (!draggableCode) return
          e.dataTransfer.setData('application/x-qcs-code', draggableCode)
          e.dataTransfer.effectAllowed = 'link'
        }}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
      >
        <span className="tree-twisty empty" />
        {icon}
        <span className="tree-label">{label}</span>
        {badge}
      </div>
    </li>
  )
}

export function ProjectExplorer() {
  const p = useProject()
  const focus = useUI((u) => u.focusMode)
  const [filter, setFilter] = useState('')
  const f = filter.trim().toLowerCase()
  const match = (s: string) => !f || s.toLowerCase().includes(f)
  const isSel = (kind: string, id: string | number) =>
    p.selected?.kind === kind && 'id' in p.selected && p.selected.id === id

  return (
    <aside className="explorer" aria-label="Project Explorer">
      <div className="pane-header">
        <span>Explore</span>
        {!focus && (
          <span className="pane-header-tools" aria-hidden="true">
            <I.ChevronDown size={10} /> <I.CloseIcon size={12} />
          </span>
        )}
      </div>
      <div className="search-box">
        <input placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search project" />
        <I.SearchGlyph />
      </div>
      <div className="tree-scroll">
        <ul className="tree" role="tree">
          <li role="treeitem" aria-expanded>
            <div
              className={'tree-row' + (p.selected?.kind === 'project' ? ' selected' : '')}
              onClick={() => p.select({ kind: 'project' })}
              onDoubleClick={() => p.openTab({ kind: 'overview' }, 0)}
            >
              <span className="tree-twisty empty" />
              <I.ProjectIcon />
              <span className="tree-label">{p.projectName}</span>
            </div>
            <ul role="group">
              <Branch icon={<I.DocIcon />} label="Documents" count={p.docs.length} defaultOpen>
                {p.docs
                  .filter((d) => match(d.name))
                  .map((d) => (
                    <Leaf
                      key={d.id}
                      icon={<I.DocIcon />}
                      label={
                        <>
                          D{d.id}: {d.name}
                        </>
                      }
                      badge={
                        <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>
                          {d.participant}
                        </span>
                      }
                      selected={isSel('document', d.id)}
                      onSelect={() => p.select({ kind: 'document', id: d.id })}
                      onOpen={() => p.openTab({ kind: 'document', id: d.id }, 0)}
                    />
                  ))}
              </Branch>
              <Branch icon={<I.QuotationIcon />} label="Quotations" count={p.quotations.length}>
                {p.quotations.length
                  ? p.quotations
                      .filter((q) => match(quotationLabel(q, p.docs)))
                      .map((q) => (
                        <Leaf
                          key={q.id}
                          icon={<I.QuotationIcon />}
                          label={
                            <>
                              {q.id} {quotationLabel(q, p.docs).slice(0, 40)}
                            </>
                          }
                          selected={isSel('quotation', q.id)}
                          onSelect={() => p.select({ kind: 'quotation', id: q.id })}
                          onOpen={() => {
                            p.openTab({ kind: 'document', id: q.docId }, 0)
                            p.select({ kind: 'quotation', id: q.id })
                          }}
                        />
                      ))
                  : undefined}
              </Branch>
              <Branch icon={<I.CodeIcon />} label="Codes" count={p.codes.length}>
                {p.codes.length
                  ? p.codes
                      .filter((c) => match(c.name))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <Leaf
                          key={c.id}
                          icon={<I.CodeIcon />}
                          label={
                            <>
                              {codeColour(c) && <span className="code-dot" style={{ background: codeColour(c) }} />}
                              {c.name} <span className="tree-count">({groundedness(c.id, p.codings)})</span>
                            </>
                          }
                          draggableCode={c.id}
                          selected={isSel('code', c.id)}
                          onSelect={() => p.select({ kind: 'code', id: c.id })}
                          onOpen={() => {
                            p.openTab({ kind: 'codeManager' }, 1)
                            p.select({ kind: 'code', id: c.id })
                          }}
                        />
                      ))
                  : undefined}
              </Branch>
              <Branch icon={<I.MemoIcon />} label="Memos" count={p.memos.length} defaultOpen>
                {p.memos
                  .filter((m) => match(m.title))
                  .map((m) => (
                    <Leaf
                      key={m.id}
                      icon={m.type === 'Field note' ? <I.FieldNoteIcon /> : m.type === 'Handoff' ? <I.CommentIcon /> : <I.MemoIcon />}
                      label={m.title}
                      selected={isSel('memo', m.id)}
                      onSelect={() => p.select({ kind: 'memo', id: m.id })}
                      onOpen={() => p.openTab({ kind: 'memo', id: m.id }, 0)}
                    />
                  ))}
              </Branch>
              {(!focus || p.networks.length > 0) && <Branch icon={<I.NetworkIcon />} label="Networks" count={p.networks.length}>
                {p.networks.length
                  ? p.networks.map((n) => (
                      <Leaf key={n.id} icon={<I.NetworkIcon />} label={n.name} onOpen={() => p.openTab({ kind: 'network', id: n.id }, 0)} />
                    ))
                  : undefined}
              </Branch>}
              {!focus && <Branch icon={<I.DocGroupIcon />} label="Document Groups" count={p.documentGroups.length}>
                {p.documentGroups.map((g) => (
                  <Leaf
                    key={g}
                    icon={<I.DocGroupIcon />}
                    label={
                      <>
                        {g} <span className="tree-count">({p.docs.filter((d) => d.groups.includes(g)).length})</span>
                      </>
                    }
                  />
                ))}
              </Branch>}
              {(!focus || p.codeGroups.length > 0) && <Branch icon={<I.CodeGroupIcon />} label="Code Groups" count={p.codeGroups.length}>
                {p.codeGroups.length
                  ? p.codeGroups.map((g) => (
                      <Leaf
                        key={g.id}
                        icon={<I.CodeGroupIcon />}
                        label={
                          <>
                            {g.name} <span className="tree-count">({g.memberCodeIds.length})</span>
                          </>
                        }
                        onOpen={() => p.openTab({ kind: 'codeManager' }, 1)}
                      />
                    ))
                  : undefined}
              </Branch>}
              {!focus && <Branch icon={<I.MemoGroupIcon />} label="Memo Groups" count={0} />}
              {!focus && <Branch icon={<I.NetworkGroupIcon />} label="Network Groups" count={0} />}
            </ul>
          </li>
        </ul>
      </div>
      <CommentPane />
    </aside>
  )
}

function CommentPane() {
  const p = useProject()
  const sel = p.selected
  let title = ''
  let value: string | undefined
  let onChange: ((v: string) => void) | null = null

  if (sel?.kind === 'quotation') {
    const q = p.quotations.find((x) => x.id === sel.id)
    if (q) {
      title = `Quotation ${q.id}`
      value = q.comment
      onChange = (v) => p.setQuotationComment(q.id, v)
    }
  } else if (sel?.kind === 'code') {
    const c = p.codes.find((x) => x.id === sel.id)
    if (c) {
      title = `Code: ${c.name}`
      value = c.comment
      onChange = (v) => p.setCodeComment(c.id, v)
    }
  }

  return (
    <section className="comment-pane" aria-label="Comment">
      <div className="comment-head">Comment:{title && <span className="comment-for"> {title}</span>}</div>
      {onChange ? (
        <textarea
          className="comment-edit"
          value={value ?? ''}
          placeholder="Click to edit comment"
          onChange={(e) => onChange!(e.target.value)}
          aria-label={`Comment for ${title}`}
        />
      ) : (
        <div className="comment-empty">Select an item to show its comment</div>
      )}
    </section>
  )
}
