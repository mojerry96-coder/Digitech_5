import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProject, codeColour, getDocText, quotationLabel, type Quotation } from '../store/project'
import { useUI, type MenuItem } from '../store/ui'
import { PARTICIPANT_COLOURS } from '../content/draftDataset'
import { CodeIcon, QuotationIcon, CreateFreeQuotationIcon, ApplyCodesIcon, InVivoIcon } from './icons'
import { codingLocked } from '../sim/session'

const CODE_MIME = 'application/x-qcs-code'

interface Segment {
  start: number
  end: number
  text: string
  /** ids of quotations covering this segment */
  qids: string[]
}

/** Map a DOM point inside the text column to a character offset in the document. */
function pointToOffset(root: HTMLElement, node: Node, offset: number, docLength: number): number | null {
  if (node === root) {
    const paras = root.querySelectorAll<HTMLElement>('[data-pstart]')
    if (offset >= paras.length) return docLength
    return Number(paras[offset].dataset.pstart)
  }
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  const para = el?.closest<HTMLElement>('[data-pstart]')
  if (!para || !root.contains(para)) return null
  const body = para.querySelector('.p-body')!
  const r = document.createRange()
  r.setStart(body, 0)
  try {
    r.setEnd(node, offset)
  } catch {
    return null
  }
  if (!body.contains(node) && node !== body) {
    // point is in the paragraph-number gutter: snap to paragraph start
    return Number(para.dataset.pstart)
  }
  return Number(para.dataset.pstart) + r.toString().length
}

/** Locate the DOM text position for a character offset (inverse of pointToOffset). */
function offsetToPoint(root: HTMLElement, off: number): { node: Node; offset: number } | null {
  const spans = root.querySelectorAll<HTMLElement>('[data-off]')
  for (const s of spans) {
    const start = Number(s.dataset.off)
    const len = s.textContent?.length ?? 0
    if (off >= start && off <= start + len && s.firstChild) return { node: s.firstChild, offset: off - start }
  }
  return null
}

interface MarginItem {
  q: Quotation
  top: number
  height: number
  lane: number
}

export function DocumentViewer({ docId }: { docId: number }) {
  const p = useProject()
  const ui = useUI()
  const doc = p.docs.find((d) => d.id === docId)
  const textRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [margin, setMargin] = useState<MarginItem[]>([])
  const [hoverQ, setHoverQ] = useState<string | null>(null)

  const text = doc ? getDocText(doc) : ''
  const quotes = useMemo(() => p.quotations.filter((q) => q.docId === docId), [p.quotations, docId])
  const sel = p.selection?.docId === docId ? p.selection : null
  const selectedQ = p.selected?.kind === 'quotation' ? quotes.find((q) => q.id === (p.selected as { id: string }).id) : undefined

  // Split each paragraph at every quotation / selection boundary.
  const paragraphs = useMemo(() => {
    if (!doc) return []
    const cuts = new Set<number>()
    for (const q of quotes) cuts.add(q.start).add(q.end)
    if (sel) cuts.add(sel.start).add(sel.end)
    let pos = 0
    return doc.paragraphs.map((ptext, i) => {
      const ps = pos
      const pe = ps + ptext.length
      pos = pe + 1
      const points = [ps, ...[...cuts].filter((c) => c > ps && c < pe).sort((a, b) => a - b), pe]
      const segs: Segment[] = []
      for (let k = 0; k < points.length - 1; k++) {
        const a = points[k]
        const b = points[k + 1]
        if (b <= a) continue
        segs.push({
          start: a,
          end: b,
          text: text.slice(a, b),
          qids: quotes.filter((q) => q.start <= a && q.end >= b).map((q) => q.id),
        })
      }
      if (!segs.length) segs.push({ start: ps, end: ps, text: '', qids: [] })
      return { index: i + 1, start: ps, segs }
    })
  }, [doc, quotes, sel, text])

  // Measure quotation extents for the margin area.
  const measure = useCallback(() => {
    const root = textRef.current
    const inner = innerRef.current
    if (!root || !inner) return
    const base = inner.getBoundingClientRect().top
    const items: MarginItem[] = []
    for (const q of quotes) {
      const a = offsetToPoint(root, q.start)
      const b = offsetToPoint(root, q.end)
      if (!a || !b) continue
      const r = document.createRange()
      r.setStart(a.node, a.offset)
      r.setEnd(b.node, b.offset)
      const rects = [...r.getClientRects()].filter((x) => x.width > 0)
      if (!rects.length) continue
      const top = Math.min(...rects.map((x) => x.top)) - base
      const bottom = Math.max(...rects.map((x) => x.bottom)) - base
      items.push({ q, top, height: Math.max(18, bottom - top), lane: 0 })
    }
    // Assign lanes so overlapping quotations sit side by side, as ATLAS.ti does.
    items.sort((x, y) => x.top - y.top || y.height - x.height)
    const laneEnds: number[] = []
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => end <= it.top)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = it.top + it.height + 4
      it.lane = lane
    }
    setMargin(items)
  }, [quotes])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (textRef.current) ro.observe(textRef.current)
    return () => ro.disconnect()
  }, [measure, paragraphs])

  if (!doc) return <div className="empty-view">Document not found.</div>

  const focus = ui.focusMode
  const laneW = focus ? 12 : 22
  const lanes = Math.max(1, ...margin.map((m) => m.lane + 1))
  const labelX = lanes * laneW + 10

  // Code labels, pushed down so they never overlap.
  let nextFree = 0
  const labels = margin
    .slice()
    .sort((a, b) => a.top - b.top)
    .flatMap((m) => {
      const cs = p.codings.filter((c) => c.quotationId === m.q.id)
      // focus mode: an uncoded quotation gets a readable, horizontal label instead of a sideways one
      const items: { coding?: (typeof cs)[number] }[] = cs.length ? cs.map((c) => ({ coding: c })) : focus ? [{}] : []
      return items.map(({ coding }) => {
        const top = Math.max(m.top, nextFree)
        nextFree = top + 24
        return { m, coding, top }
      })
    })

  const onMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const root = textRef.current!
    const ws = window.getSelection()
    if (!ws || ws.isCollapsed || !ws.rangeCount) {
      // plain click: select the innermost quotation under the pointer
      const seg = (e.target as HTMLElement).closest<HTMLElement>('[data-q]')
      const ids = seg?.dataset.q ? seg.dataset.q.split(',') : []
      p.setSelection(null)
      if (ids.length) {
        const inner = ids
          .map((id) => quotes.find((q) => q.id === id)!)
          .sort((a, b) => a.end - a.start - (b.end - b.start))[0]
        p.select({ kind: 'quotation', id: inner.id })
      } else p.select({ kind: 'document', id: docId })
      return
    }
    const rg = ws.getRangeAt(0)
    let a = pointToOffset(root, rg.startContainer, rg.startOffset, text.length)
    let b = pointToOffset(root, rg.endContainer, rg.endOffset, text.length)
    if (a === null || b === null) return
    if (a > b) [a, b] = [b, a]
    while (a < b && /\s/.test(text[a])) a++
    while (b > a && /\s/.test(text[b - 1])) b--
    const anchor = rg.getBoundingClientRect()
    ws.removeAllRanges()
    if (b <= a) return p.setSelection(null)
    p.setSelection({ docId, start: a, end: b })
    ui.setSelRect({ left: anchor.left, top: anchor.top, bottom: anchor.bottom, right: anchor.right })
    // open the coding dialogue just below the selection so the margin stays visible
    ui.setAnchor({ x: Math.min(anchor.left, window.innerWidth - 380), y: Math.min(anchor.bottom + 10, window.innerHeight - 380) })
  }

  const contextItems = (qid?: string): MenuItem[] => {
    const hasSel = !!p.selection
    const target = qid ?? (p.selected?.kind === 'quotation' ? p.selected.id : undefined)
    const last = p.codes.find((c) => c.id === p.lastUsedCodeId)
    const locked = codingLocked()
    return [
      { label: 'Create Free Quotation', disabled: !hasSel, onClick: p.createFreeQuotation },
      { label: 'Apply Codes…', shortcut: 'Ctrl+J', disabled: locked || (!hasSel && !target), onClick: () => ui.openApplyCodes() },
      { label: 'Code in Vivo', disabled: locked || !hasSel, onClick: p.codeInVivo },
      { label: last ? `Quick Coding: ${last.name}` : 'Quick Coding', shortcut: 'Ctrl+L', disabled: locked || !last || (!hasSel && !target), onClick: p.quickCode },
      { separator: true, label: '' },
      { label: 'Delete Quotation', danger: true, disabled: !target, onClick: () => target && p.deleteQuotation(target) },
    ]
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const seg = (e.target as HTMLElement).closest<HTMLElement>('[data-q]')
    const qid = !p.selection && seg?.dataset.q ? seg.dataset.q.split(',').pop() : undefined
    if (qid) p.select({ kind: 'quotation', id: qid })
    ui.setAnchor({ x: Math.min(e.clientX + 12, window.innerWidth - 380), y: Math.max(80, e.clientY - 8) })
    ui.openContextMenu(e.clientX, e.clientY, contextItems(qid))
  }

  const acceptCode = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(CODE_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
    }
  }

  const onDropText = (e: React.DragEvent) => {
    const codeId = e.dataTransfer.getData(CODE_MIME)
    if (!codeId) return
    e.preventDefault()
    if (codingLocked()) return ui.showToast('Coding opens after segmentation.')
    if (p.selection?.docId === docId) return p.codeSelection(codeId)
    const seg = (e.target as HTMLElement).closest<HTMLElement>('[data-q]')
    const qid = seg?.dataset.q?.split(',').pop()
    if (qid) p.applyCode(qid, codeId)
    else ui.showToast('Highlight a data segment first, then drop the code onto it.')
  }

  return (
    <div className="doc-view">
      {doc.draft && !focus && (
        <div className="info-bar" role="note">
          <strong>DRAFT</strong> placeholder transcript. Replace with authored source content before sign-off.
        </div>
      )}
      {focus && sel && ui.selRect && <SelectionBar rect={ui.selRect} />}
      <div className="doc-scroll" onScroll={() => ui.selRect && ui.setSelRect(null)}>
        <div className="doc-inner" ref={innerRef}>
          <div
            className="doc-text"
            ref={textRef}
            onMouseUp={onMouseUp}
            onContextMenu={onContextMenu}
            onDragOver={acceptCode}
            onDrop={onDropText}
            aria-label={`${doc.name} text`}
          >
            <div className="doc-title-line">
              <span className="ptag" style={{ background: PARTICIPANT_COLOURS[doc.participant] }}>
                {doc.participant}
              </span>
              {doc.name}
              {doc.draft && focus && (
                <span className="draft-chip" title="Placeholder transcript: replace with authored source content before sign-off">
                  DRAFT
                </span>
              )}
            </div>
            {paragraphs.map((para) => (
              <div className="para" key={para.index} data-pstart={para.start}>
                <span className="p-num" aria-hidden="true">
                  {para.index}
                </span>
                <p className="p-body">
                  {para.segs.map((s) => {
                    const inSel = sel && s.start >= sel.start && s.end <= sel.end
                    const inSelQ = selectedQ && s.start >= selectedQ.start && s.end <= selectedQ.end
                    const inHover = hoverQ && s.qids.includes(hoverQ)
                    return (
                      <span
                        key={s.start}
                        data-off={s.start}
                        data-q={s.qids.length ? s.qids.join(',') : undefined}
                        className={(inSel || inSelQ ? 'hl-sel' : inHover ? 'hl-hover' : '') || undefined}
                      >
                        {s.text}
                      </span>
                    )
                  })}
                </p>
              </div>
            ))}
          </div>

          <div className="margin" aria-label="Margin area" style={{ minWidth: labelX + 200 }}>
            {margin.map((m) => {
              const active = selectedQ?.id === m.q.id
              return (
                <div
                  key={m.q.id}
                  className={'q-bar' + (active ? ' active' : '')}
                  style={{ top: m.top, height: m.height, left: 6 + m.lane * laneW }}
                  title={`${m.q.id} ${quotationLabel(m.q, p.docs)}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Quotation ${m.q.id}`}
                  onMouseEnter={() => setHoverQ(m.q.id)}
                  onMouseLeave={() => setHoverQ(null)}
                  onClick={() => {
                    p.setSelection(null)
                    p.select({ kind: 'quotation', id: m.q.id })
                  }}
                  onDoubleClick={(e) => {
                    p.setSelection(null)
                    p.select({ kind: 'quotation', id: m.q.id })
                    if (codingLocked()) return
                    ui.openApplyCodes({ x: Math.min(e.clientX + 16, window.innerWidth - 380), y: e.clientY - 10 })
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    p.setSelection(null)
                    p.select({ kind: 'quotation', id: m.q.id })
                    ui.setAnchor({ x: Math.min(e.clientX + 16, window.innerWidth - 380), y: e.clientY - 10 })
                    ui.openContextMenu(e.clientX, e.clientY, contextItems(m.q.id))
                  }}
                  onDragOver={acceptCode}
                  onDrop={(e) => {
                    const codeId = e.dataTransfer.getData(CODE_MIME)
                    if (!codeId) return
                    e.preventDefault()
                    if (codingLocked()) return ui.showToast('Coding opens after segmentation.')
                    p.applyCode(m.q.id, codeId)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      p.select({ kind: 'quotation', id: m.q.id })
                      ui.openApplyCodes()
                    }
                  }}
                >
                  <span className="q-bar-label">
                    {m.q.id} {quotationLabel(m.q, p.docs)}
                  </span>
                </div>
              )
            })}
            {labels.map(({ m, coding, top }) => {
              if (!coding)
                return (
                  <button
                    key={m.q.id + '-q'}
                    className={'quote-label' + (selectedQ?.id === m.q.id ? ' active' : '')}
                    style={{ top, left: labelX }}
                    title={`${m.q.id} ${quotationLabel(m.q, p.docs)}`}
                    onMouseEnter={() => setHoverQ(m.q.id)}
                    onMouseLeave={() => setHoverQ(null)}
                    onClick={() => {
                      p.setSelection(null)
                      p.select({ kind: 'quotation', id: m.q.id })
                    }}
                    onDragOver={acceptCode}
                    onDrop={(e) => {
                      const codeId = e.dataTransfer.getData(CODE_MIME)
                      if (!codeId) return
                      e.preventDefault()
                      if (codingLocked()) return ui.showToast('Coding opens after segmentation.')
                      p.applyCode(m.q.id, codeId)
                    }}
                  >
                    <QuotationIcon size={12} />
                    <span className="quote-label-id">{m.q.id}</span>
                    <span className="code-label-text">{quotationLabel(m.q, p.docs)}</span>
                  </button>
                )
              const code = p.codes.find((c) => c.id === coding.codeId)
              if (!code) return null
              const col = codeColour(code)
              return (
                <div
                  key={m.q.id + coding.codeId + coding.coder}
                  className={'code-label' + (selectedQ?.id === m.q.id ? ' active' : '')}
                  style={{ top, left: labelX, borderLeftColor: col ?? '#C9CED6' }}
                  title={`${code.name}${code.comment ? `\n\n${code.comment}` : ''}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(CODE_MIME, code.id)}
                  onMouseEnter={() => setHoverQ(m.q.id)}
                  onMouseLeave={() => setHoverQ(null)}
                  onClick={() => p.select({ kind: 'code', id: code.id })}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    ui.openContextMenu(e.clientX, e.clientY, [
                      { label: `Unlink “${code.name}” from ${m.q.id}`, onClick: () => p.unlinkCode(m.q.id, code.id) },
                      { label: 'Open in Code Manager', onClick: () => { p.openTab({ kind: 'codeManager' }, 1); p.select({ kind: 'code', id: code.id }) } },
                    ])
                  }}
                >
                  <CodeIcon size={12} color={col} />
                  {code.comment && <span className="has-comment" aria-label="has comment" />}
                  <span className="code-label-text">{code.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Focus mode: a small bar above the live selection with the next sensible actions. */
function SelectionBar({ rect }: { rect: { left: number; top: number; bottom: number; right: number } }) {
  const p = useProject()
  const ui = useUI()
  const locked = codingLocked()
  const top = rect.top > 140 ? rect.top - 46 : rect.bottom + 8
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - (locked ? 200 : 380)))
  // mousedown would clear the selection before the click lands
  const keep = (e: React.MouseEvent) => e.preventDefault()
  return (
    <div className="sel-bar" style={{ top, left }} role="toolbar" aria-label="Selection actions" onMouseDown={keep}>
      <button className="sel-btn primary" onClick={p.createFreeQuotation}>
        <CreateFreeQuotationIcon size={16} /> Create quotation
      </button>
      {!locked && (
        <>
          <button className="sel-btn" onClick={() => ui.openApplyCodes()}>
            <ApplyCodesIcon size={16} /> Apply code
          </button>
          <button className="sel-btn" onClick={p.codeInVivo} title="Use the selected words as the code name">
            <InVivoIcon size={16} /> In vivo
          </button>
        </>
      )}
    </div>
  )
}
