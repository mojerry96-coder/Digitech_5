import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useProject,
  codeColour,
  nodeId,
  quotationLabel,
  RELATIONS,
  type NetNode,
  type NodeKind,
  type Relation,
} from '../store/project'
import { useSession } from '../sim/session'
import { CANDIDATE_THEMES } from '../content/answerKey'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import * as I from './icons'

const RELATION_STYLE: Record<Relation, { color: string; dash?: string }> = {
  'is part of': { color: '#2f6db5' },
  supports: { color: '#16A34A' },
  contradicts: { color: '#DC2626', dash: '6 4' },
  'is associated with': { color: '#6b7280', dash: '2 3' },
  'is cause of': { color: '#a16207' },
}

function useNodeLabel() {
  const p = useProject()
  const s = useSession()
  return (n: NetNode): { title: string; sub?: string; icon: JSX.Element; tag?: { text: string; color: string } } => {
    switch (n.kind) {
      case 'theme': {
        const top = CANDIDATE_THEMES.find((t) => t.id === (s.theme?.themeId ?? s.themeRanking[0]))
        return { title: `THEME: ${s.theme?.label ?? top?.label ?? 'Theme'}`, icon: <I.CodeIcon size={14} color="#8B5CF6" /> }
      }
      case 'codeGroup': {
        const g = p.codeGroups.find((x) => x.id === n.refId)
        return { title: g?.name ?? n.refId, sub: `${g?.memberCodeIds.length ?? 0} codes`, icon: <I.CodeGroupIcon size={14} /> }
      }
      case 'code': {
        const c = p.codes.find((x) => x.id === n.refId)
        return { title: c?.name ?? n.refId, icon: <I.CodeIcon size={14} color={codeColour(c)} /> }
      }
      case 'memo': {
        const m = p.memos.find((x) => x.id === n.refId)
        return { title: m?.title ?? n.refId, icon: m?.type === 'Field note' ? <I.FieldNoteIcon size={14} /> : <I.MemoIcon size={14} /> }
      }
      case 'quotation': {
        const q = p.quotations.find((x) => x.id === n.refId)
        const d = q && p.docs.find((x) => x.id === q.docId)
        const text = q ? quotationLabel(q, p.docs) : ''
        return {
          title: `${n.refId} ${text.length > 70 ? text.slice(0, 70) + '…' : text}`,
          icon: <I.QuotationIcon size={14} />,
          tag: d ? { text: d.participant, color: PARTICIPANT_COLOURS[d.participant] } : undefined,
        }
      }
    }
  }
}

const NODE_W = 210

export function NetworkEditor({ netId }: { netId: string }) {
  const p = useProject()
  const net = p.networks.find((n) => n.id === netId)
  const label = useNodeLabel()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [linkMode, setLinkMode] = useState(false)
  const [relation, setRelation] = useState<Relation>('is part of')
  const [source, setSource] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [panel, setPanel] = useState(true)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSource(null)
        setLinkMode(false)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'SELECT') {
        if (selectedLink) p.removeLink(netId, selectedLink)
        else if (selectedNode && !selectedNode.startsWith('theme:')) p.removeNode(netId, selectedNode)
        setSelectedLink(null)
        setSelectedNode(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedLink, selectedNode, netId, p])

  // Measure node heights so links attach to box edges.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const h: Record<string, number> = {}
    el.querySelectorAll<HTMLElement>('[data-node]').forEach((n) => (h[n.dataset.node!] = n.offsetHeight))
    setHeights((prev) => (JSON.stringify(prev) === JSON.stringify(h) ? prev : h))
  })

  if (!net) return <div className="empty-view">This network has not been created yet.</div>

  const centre = (n: NetNode) => ({ x: n.x + NODE_W / 2, y: n.y + (heights[n.id] ?? 40) / 2 })
  const byId = new Map(net.nodes.map((n) => [n.id, n]))

  const onNodePointerDown = (e: React.PointerEvent, n: NetNode) => {
    if (linkMode) return
    const rect = canvasRef.current!.getBoundingClientRect()
    drag.current = { id: n.id, dx: e.clientX - rect.left + canvasRef.current!.scrollLeft - n.x, dy: e.clientY - rect.top + canvasRef.current!.scrollTop - n.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left + canvasRef.current!.scrollLeft - drag.current.dx)
    const y = Math.max(0, e.clientY - rect.top + canvasRef.current!.scrollTop - drag.current.dy)
    p.moveNode(netId, drag.current.id, Math.round(x), Math.round(y))
  }
  const onNodeClick = (n: NetNode) => {
    setSelectedLink(null)
    if (!linkMode) return setSelectedNode(n.id)
    if (!source) return setSource(n.id)
    if (source !== n.id) p.addLink(netId, source, n.id, relation)
    setSource(null)
  }

  return (
    <div className="net-view">
      <div className="net-toolbar" role="toolbar" aria-label="Network tools">
        <button className={'net-tool' + (linkMode ? ' on' : '')} aria-pressed={linkMode} onClick={() => { setLinkMode((x) => !x); setSource(null) }}>
          <I.LinkIcon size={16} /> Link Nodes
        </button>
        <label className="net-rel">
          Relation
          <select value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
            {RELATIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        {linkMode && <span className="net-hint">{source ? 'Now click the target node (Esc to cancel)' : 'Click the source node'}</span>}
        <button
          className="net-tool"
          disabled={!selectedNode && !selectedLink}
          onClick={() => {
            if (selectedLink) p.removeLink(netId, selectedLink)
            else if (selectedNode && !selectedNode.startsWith('theme:')) p.removeNode(netId, selectedNode)
            setSelectedLink(null)
            setSelectedNode(null)
          }}
        >
          <I.DeleteIcon size={14} /> Remove
        </button>
        <button className="net-tool right" onClick={() => setPanel((x) => !x)} aria-expanded={panel}>
          {panel ? 'Hide' : 'Show'} node & link list
        </button>
      </div>
      <div className="net-body">
        <div className="net-canvas" ref={canvasRef} onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)} onClick={(e) => e.target === e.currentTarget && (setSelectedNode(null), setSelectedLink(null))}>
          <svg className="net-links" width={1600} height={1000} aria-hidden="true">
            <defs>
              {Object.entries(RELATION_STYLE).map(([r, st]) => (
                <marker key={r} id={`arrow-${r.replace(/\s/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 10 5 0 10z" fill={st.color} />
                </marker>
              ))}
            </defs>
            {net.links.map((l) => {
              const a = byId.get(l.from)
              const b = byId.get(l.to)
              if (!a || !b) return null
              const ca = centre(a)
              const cb = centre(b)
              const st = RELATION_STYLE[l.relation]
              // stop the line at the target box edge
              const hb = (heights[b.id] ?? 40) / 2
              const dx = cb.x - ca.x
              const dy = cb.y - ca.y
              const t = Math.min(Math.abs((NODE_W / 2) / (dx || 1e-6)), Math.abs(hb / (dy || 1e-6)), 1)
              const ex = cb.x - dx * t
              const ey = cb.y - dy * t
              return (
                <g key={l.id} className={'net-link' + (selectedLink === l.id ? ' sel' : '')}>
                  <line x1={ca.x} y1={ca.y} x2={ex} y2={ey} stroke={st.color} strokeWidth={selectedLink === l.id ? 3 : 1.6} strokeDasharray={st.dash} markerEnd={`url(#arrow-${l.relation.replace(/\s/g, '')})`} />
                </g>
              )
            })}
          </svg>
          {net.links.map((l) => {
            const a = byId.get(l.from)
            const b = byId.get(l.to)
            if (!a || !b) return null
            const ca = centre(a)
            const cb = centre(b)
            return (
              <button
                key={l.id}
                className={'net-link-label' + (selectedLink === l.id ? ' sel' : '')}
                style={{ left: (ca.x + cb.x) / 2, top: (ca.y + cb.y) / 2, color: RELATION_STYLE[l.relation].color }}
                onClick={() => { setSelectedLink(l.id); setSelectedNode(null) }}
                aria-label={`Link: ${label(a).title} ${l.relation} ${label(b).title}`}
              >
                {l.relation}
              </button>
            )
          })}
          {net.nodes.map((n) => {
            const lab = label(n)
            return (
              <div
                key={n.id}
                data-node={n.id}
                className={['net-node', `k-${n.kind}`, selectedNode === n.id && 'sel', source === n.id && 'src', linkMode && 'linkable'].filter(Boolean).join(' ')}
                style={{ left: n.x, top: n.y, width: NODE_W }}
                role="button"
                tabIndex={0}
                aria-label={lab.title}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onClick={() => onNodeClick(n)}
                onKeyDown={(e) => e.key === 'Enter' && onNodeClick(n)}
              >
                <span className="net-node-icon">{lab.icon}</span>
                <span className="net-node-text">
                  {lab.tag && (
                    <span className="ptag" style={{ background: lab.tag.color }}>
                      {lab.tag.text}
                    </span>
                  )}{' '}
                  {lab.title}
                  {lab.sub && <span className="net-node-sub">{lab.sub}</span>}
                </span>
              </div>
            )
          })}
        </div>
        {panel && <NetworkSidePanel netId={netId} relation={relation} />}
      </div>
    </div>
  )
}

/** List-based equivalent: add nodes, add/remove links with selects (keyboard and screen-reader friendly). */
function NetworkSidePanel({ netId, relation }: { netId: string; relation: Relation }) {
  const p = useProject()
  const net = p.networks.find((n) => n.id === netId)!
  const label = useNodeLabel()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rel, setRel] = useState<Relation>(relation)
  const [qFilter, setQFilter] = useState('')
  useEffect(() => setRel(relation), [relation])
  const has = (kind: NodeKind, id: string) => net.nodes.some((n) => n.id === nodeId(kind, id))
  const place = () => {
    const k = net.nodes.length
    return { x: 40 + (k % 4) * 240, y: 520 + Math.floor(k / 4) * 70 }
  }
  const add = (kind: NodeKind, id: string) => {
    const { x, y } = place()
    p.addNode(netId, kind, id, x, y)
  }
  const quotes = useMemo(() => {
    const f = qFilter.trim().toLowerCase()
    return p.quotations.filter((q) => !f || `${q.id} ${quotationLabel(q, p.docs)}`.toLowerCase().includes(f))
  }, [p.quotations, p.docs, qFilter])

  return (
    <aside className="net-side" aria-label="Nodes and links">
      <section>
        <h4>Links</h4>
        <ul className="net-linklist">
          {net.links.map((l) => {
            const a = net.nodes.find((n) => n.id === l.from)
            const b = net.nodes.find((n) => n.id === l.to)
            if (!a || !b) return null
            return (
              <li key={l.id}>
                <span>
                  {label(a).title.slice(0, 40)} <em>{l.relation}</em> {label(b).title.slice(0, 40)}
                </span>
                <button className="link-btn" onClick={() => p.removeLink(netId, l.id)} aria-label="Remove link">
                  <I.CloseIcon size={14} />
                </button>
              </li>
            )
          })}
          {!net.links.length && <li className="muted">No links yet.</li>}
        </ul>
        <div className="net-addlink">
          <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Link from">
            <option value="">From…</option>
            {net.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {label(n).title.slice(0, 60)}
              </option>
            ))}
          </select>
          <select value={rel} onChange={(e) => setRel(e.target.value as Relation)} aria-label="Relation">
            {RELATIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Link to">
            <option value="">To…</option>
            {net.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {label(n).title.slice(0, 60)}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!from || !to || from === to} onClick={() => { p.addLink(netId, from, to, rel); setFrom(''); setTo('') }}>
            Add link
          </button>
        </div>
      </section>
      <section>
        <h4>Add nodes</h4>
        <div className="net-addgroup">
          <div className="net-addhead">Categories</div>
          {p.codeGroups.map((g) => (
            <button key={g.id} className="net-add" disabled={has('codeGroup', g.id)} onClick={() => add('codeGroup', g.id)}>
              <I.CodeGroupIcon size={13} /> {g.name}
            </button>
          ))}
          {!p.codeGroups.length && <span className="muted small-note">No code groups yet</span>}
        </div>
        <div className="net-addgroup">
          <div className="net-addhead">Memos</div>
          {p.memos
            .filter((m) => m.type === 'Field note')
            .map((m) => (
              <button key={m.id} className="net-add" disabled={has('memo', m.id)} onClick={() => add('memo', m.id)}>
                <I.FieldNoteIcon size={13} /> {m.title}
              </button>
            ))}
        </div>
        <div className="net-addgroup">
          <div className="net-addhead">Quotations</div>
          <input className="net-filter" placeholder="Filter quotations" value={qFilter} onChange={(e) => setQFilter(e.target.value)} aria-label="Filter quotations" />
          <div className="net-qlist">
            {quotes.map((q) => {
              const d = p.docs.find((x) => x.id === q.docId)
              return (
                <button key={q.id} className="net-add" disabled={has('quotation', q.id)} onClick={() => add('quotation', q.id)}>
                  {d && (
                    <span className="ptag" style={{ background: PARTICIPANT_COLOURS[d.participant] }}>
                      {d.participant}
                    </span>
                  )}
                  <span className="net-add-q">
                    {q.id} {quotationLabel(q, p.docs).slice(0, 60)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </aside>
  )
}
