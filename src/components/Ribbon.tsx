import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useProject, tabKey } from '../store/project'
import { useUI, type RibbonTab } from '../store/ui'
import { PRODUCT_NAME } from '../config'
import { useSession } from '../sim/session'
import * as I from './icons'

const CORE_TABS: RibbonTab[] = ['Home', 'Search & Code', 'Analyze', 'Import & Export', 'Tools', 'Help']
const NOT_IN_SIM = 'Not available in this simulation'

function useFocusedTab() {
  return useProject((s) => {
    const g = s.groups[s.focusedGroup]
    return g.tabs.find((t) => tabKey(t) === g.active) ?? null
  })
}

/** The contextual tab set for whatever is focused (ATLAS.ti shows these in a coloured box). */
function useContext(): { label: string; tabs: RibbonTab[] } | null {
  const t = useFocusedTab()
  if (t?.kind === 'document') return { label: 'Document', tabs: ['Document', 'View'] }
  if (t?.kind === 'codeManager') return { label: 'Code Manager', tabs: ['Code Manager', 'View'] }
  return null
}

export function TitleBar() {
  const projectName = useProject((s) => s.projectName)
  return (
    <header className="titlebar" role="banner">
      <div className="qat" aria-label="Quick access toolbar">
        <I.AppGlyph size={18} />
        <button className="qat-btn" title="Save (Ctrl+S)" aria-label="Save">
          <I.SaveIcon size={15} />
        </button>
        <button className="qat-btn" title="Undo" aria-label="Undo" disabled>
          <I.UndoIcon size={15} />
        </button>
        <button className="qat-btn" title="Redo" aria-label="Redo" disabled>
          <I.RedoIcon size={15} />
        </button>
      </div>
      <div className="title-text">
        {projectName} - {PRODUCT_NAME}
      </div>
      <div className="win-controls" aria-hidden="true">
        <span>
          <I.MinusIcon size={14} />
        </span>
        <span>
          <I.SquareIcon size={12} />
        </span>
        <span className="close">
          <I.CloseIcon size={14} />
        </span>
      </div>
    </header>
  )
}

export function Ribbon() {
  const { ribbonTab, setRibbonTab, setBackstage } = useUI()
  const ctx = useContext()
  const focused = useFocusedTab()
  const focusedKey = focused ? tabKey(focused) : null
  const ctxRef = useRef<HTMLDivElement>(null)

  // The contextual-tab label rises into the title bar; keep the window title clear of it.
  useLayoutEffect(() => {
    const el = ctxRef.current
    const root = document.documentElement.style
    root.setProperty('--ctx-right', el ? `${el.getBoundingClientRect().right + 16}px` : '0px')
    root.setProperty('--title-right', el ? '150px' : '0px')
  })

  // Opening a document or a manager switches to its contextual tab, as ATLAS.ti does.
  useEffect(() => {
    if (ctx) setRibbonTab(ctx.tabs[0])
    else if (ribbonTab === 'Document' || ribbonTab === 'Code Manager' || ribbonTab === 'View') setRibbonTab('Home')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedKey])

  return (
    <div className="ribbon">
      <div className="ribbon-tabs" role="tablist" aria-label="Ribbon">
        <button className="file-tab" onClick={() => setBackstage(true)}>
          File
        </button>
        {CORE_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={ribbonTab === t}
            className={'ribbon-tab' + (ribbonTab === t ? ' active' : '')}
            onClick={() => setRibbonTab(t)}
          >
            {t}
          </button>
        ))}
        {ctx && (
          <div className="ctx-tabs" data-label={ctx.label} ref={ctxRef}>
            {ctx.tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={ribbonTab === t}
                className={'ribbon-tab' + (ribbonTab === t ? ' active' : '')}
                onClick={() => setRibbonTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ribbon-body" role="toolbar" aria-label={`${ribbonTab} commands`}>
        <RibbonContent tab={ribbonTab} />
      </div>
    </div>
  )
}

function Btn({
  icon,
  label,
  onClick,
  disabled,
  title,
  dropdown,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
  dropdown?: boolean
}) {
  return (
    <button className="rb-btn" onClick={onClick} disabled={disabled} title={title ?? label}>
      <span className="rb-icon">{icon}</span>
      <span className="rb-label">
        {label}
        {dropdown && <I.ChevronDown size={7} className="rb-caret" />}
      </span>
    </button>
  )
}

function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rb-group" role="group" aria-label={label}>
      <div className="rb-group-items">{children}</div>
      {label && <div className="rb-group-label">{label}</div>}
    </div>
  )
}

function RibbonContent({ tab }: { tab: RibbonTab }) {
  const p = useProject()
  const ui = useUI()
  const hasSel = !!p.selection
  const selQ = p.selected?.kind === 'quotation' ? p.selected.id : null
  const selCode = p.selected?.kind === 'code' ? p.selected.id : null
  const lastCode = p.codes.find((c) => c.id === p.lastUsedCodeId)
  const locked = useSession((s) => s.stage === 'workspace' && s.gp1Phase === 'A')
  const LOCKED = 'Coding opens after segmentation'

  switch (tab) {
    case 'Home':
      return (
        <>
          <Group>
            <Btn icon={<I.AddDocumentsIcon size={30} />} label="Add Documents" dropdown disabled title={NOT_IN_SIM} />
            <Btn
              icon={<I.NewEntitiesIcon size={30} />}
              label="New Entities"
              dropdown
              onClick={() => {
                const name = window.prompt('New code name')
                if (name?.trim()) p.createCode(name)
              }}
            />
          </Group>
          <Group>
            <Btn icon={<I.CommentIcon size={30} />} label="Project Comment" onClick={() => p.select({ kind: 'project' })} />
          </Group>
          <Group>
            <Btn icon={<I.NavigatorIcon size={30} />} label="Navigator" dropdown disabled title={NOT_IN_SIM} />
          </Group>
          <Group>
            <Btn icon={<I.DocManagerIcon size={30} />} label="Documents" dropdown onClick={() => p.openTab({ kind: 'documentManager' })} />
            <Btn icon={<I.QuotationManagerIcon size={30} />} label="Quotations" dropdown onClick={() => p.openTab({ kind: 'quotationManager' })} />
            <Btn icon={<I.CodeManagerIcon size={30} />} label="Codes" dropdown onClick={() => p.openTab({ kind: 'codeManager' }, 1)} />
            <Btn icon={<I.MemoManagerIcon size={30} />} label="Memos" dropdown disabled title="Unlocks later in the case" />
            <Btn
              icon={<I.NetworkManagerIcon size={30} />}
              label="Networks"
              dropdown
              disabled={!p.networks.length}
              title={p.networks.length ? 'Open network' : 'Unlocks later in the case'}
              onClick={() => p.networks[0] && p.openTab({ kind: 'network', id: p.networks[0].id }, 0)}
            />
            <Btn icon={<I.LinkManagerIcon size={30} />} label="Links" dropdown disabled title="Unlocks later in the case" />
          </Group>
        </>
      )
    case 'Document':
      return (
        <>
          <Group label="Coding">
            <Btn icon={<I.CreateFreeQuotationIcon size={28} />} label="Create Free Quotation" disabled={!hasSel} onClick={p.createFreeQuotation} />
            <Btn
              icon={<I.ApplyCodesIcon size={28} />}
              label="Apply Codes"
              title={locked ? LOCKED : undefined}
              disabled={locked || (!hasSel && !selQ)}
              onClick={() => ui.openApplyCodes()}
            />
            <Btn icon={<I.InVivoIcon size={28} />} label="Code In Vivo" title={locked ? LOCKED : undefined} disabled={locked || !hasSel} onClick={p.codeInVivo} />
            <Btn
              icon={<I.QuickCodingIcon size={28} />}
              label="Quick Coding"
              title={locked ? LOCKED : lastCode ? `Quick Coding: ${lastCode.name}` : 'Quick Coding'}
              disabled={locked || !lastCode || (!hasSel && !selQ)}
              onClick={p.quickCode}
            />
            <Btn icon={<I.SearchCodeIcon size={28} />} label="Search & Code" dropdown disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="FG" size={28} />} label="Focus Group Coding" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="AI" size={28} />} label="AI Coding" disabled title={NOT_IN_SIM} />
          </Group>
          <Group label="Quotation">
            <Btn icon={<I.RenameIcon size={28} />} label="Rename" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.DeleteIcon size={28} />} label="Delete" disabled={!selQ} onClick={() => selQ && p.deleteQuotation(selQ)} />
          </Group>
          <Group label="Margin Entities">
            <Btn icon={<I.UnlinkIcon size={28} />} label="Unlink" disabled title="Right-click a code in the margin to unlink it" />
            <Btn
              icon={<I.EditCommentIcon size={28} />}
              label="Edit Comment"
              disabled={!selQ}
              onClick={() => {
                const q = p.quotations.find((x) => x.id === selQ)
                if (!q) return
                const c = window.prompt(`Comment for quotation ${q.id}`, q.comment ?? '')
                if (c !== null) p.setQuotationComment(q.id, c)
              }}
            />
          </Group>
          <Group label="Document">
            <Btn icon={<I.PrintIcon size={28} />} label="Print" disabled title={NOT_IN_SIM} />
          </Group>
        </>
      )
    case 'Code Manager':
      return (
        <>
          <Group label="New">
            <Btn
              icon={<I.NewCodeIcon size={28} />}
              label="New Codes"
              onClick={() => {
                const name = window.prompt('New code name')
                if (name?.trim()) p.select({ kind: 'code', id: p.createCode(name).id })
              }}
            />
          </Group>
          <Group label="Edit">
            <Btn icon={<I.DeleteIcon size={28} />} label="Delete" disabled={!selCode} onClick={() => selCode && p.deleteCode(selCode)} />
            <Btn icon={<I.RenameIcon size={28} />} label="Rename" disabled={!selCode} onClick={() => ui.setRenameCode(selCode)} />
            <Btn
              icon={<I.MergeIcon size={28} />}
              label="Merge Codes"
              disabled={!selCode || p.codes.length < 2}
              onClick={() => selCode && ui.openMerge({ targetId: selCode, sourceIds: [] })}
            />
          </Group>
          <Group label="Code type">
            <Btn icon={<I.ColourIcon size={28} />} label="Set Type" disabled title="Use the Type column in the Code Manager" />
          </Group>
        </>
      )
    case 'View':
      return (
        <Group label="Show">
          <Btn icon={<I.GenericIcon glyph="¶" size={28} />} label="Paragraph Numbers" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="▥" size={28} />} label="Margin" disabled title={NOT_IN_SIM} />
        </Group>
      )
    case 'Search & Code':
      return (
        <>
          <Group label="Search & Code">
            <Btn icon={<I.SearchCodeIcon size={28} />} label="Text Search" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph=".*" size={28} />} label="Regex Search" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="NE" size={28} />} label="Named Entity Recognition" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="☺" size={28} />} label="Sentiment Analysis" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="C" size={28} />} label="Concepts" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="OM" size={28} />} label="Opinion Mining" disabled title={NOT_IN_SIM} />
          </Group>
          <Group label="AI">
            <Btn icon={<I.GenericIcon glyph="AI" size={28} />} label="AI Coding" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="IA" size={28} />} label="Intentional AI Coding" disabled title={NOT_IN_SIM} />
            <Btn icon={<I.GenericIcon glyph="Σ" size={28} />} label="AI Summaries" disabled title={NOT_IN_SIM} />
          </Group>
          <Group label="Explore">
            <Btn icon={<I.GenericIcon glyph="W" size={28} />} label="Word Frequencies" disabled title={NOT_IN_SIM} />
          </Group>
        </>
      )
    case 'Analyze':
      return (
        <Group label="Analyze">
          <Btn icon={<I.GenericIcon glyph="⊞" size={28} />} label="Code Co-Occurrence" disabled title="Unlocks later in the case" />
          <Btn icon={<I.GenericIcon glyph="▦" size={28} />} label="Code-Document" disabled title="Unlocks later in the case" />
          <Btn icon={<I.GenericIcon glyph="?" size={28} />} label="Query Tool" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="◇" size={28} />} label="Smart Codes" disabled title={NOT_IN_SIM} />
        </Group>
      )
    case 'Import & Export':
      return (
        <Group label="Import & Export">
          <Btn icon={<I.GenericIcon glyph="⇩" size={28} />} label="Import Codebook" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="⇧" size={28} />} label="Export Codebook" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="SP" size={28} />} label="SPSS Export" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="X" size={28} />} label="Excel Export" disabled title={NOT_IN_SIM} />
        </Group>
      )
    case 'Tools':
      return (
        <Group label="Tools">
          <Btn icon={<I.GenericIcon glyph="👤" size={28} />} label="User Management" disabled title="Unlocks later in the case" />
          <Btn icon={<I.GenericIcon glyph="≡" size={28} />} label="Redundant Codings" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.SearchCodeIcon size={28} />} label="Search Project" disabled title={NOT_IN_SIM} />
        </Group>
      )
    case 'Help':
      return (
        <Group label="Help">
          <Btn icon={<I.GenericIcon glyph="?" size={28} />} label="Manual" disabled title={NOT_IN_SIM} />
          <Btn icon={<I.GenericIcon glyph="▶" size={28} />} label="Video Tutorials" title="Watch the walkthrough" onClick={() => ui.setWalkthrough(true)} />
        </Group>
      )
  }
}

/* ============================================================
   Focus mode: one slim toolbar whose commands follow the work
   surface, instead of the six-tab ATLAS.ti ribbon.
   ============================================================ */
function TB({ icon, label, onClick, disabled, title, primary }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean; title?: string; primary?: boolean }) {
  return (
    <button className={'tb-btn' + (primary ? ' primary' : '')} onClick={onClick} disabled={disabled} title={title ?? label}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function FocusToolbar() {
  const p = useProject()
  const ui = useUI()
  const focused = useFocusedTab()
  const locked = useSession((s) => s.stage === 'workspace' && s.sequence === 'GP1' && s.gp1Phase === 'A')
  const hasSel = !!p.selection
  const selQ = p.selected?.kind === 'quotation' ? p.selected.id : null
  const lastCode = p.codes.find((c) => c.id === p.lastUsedCodeId)
  const onDoc = focused?.kind === 'document'
  const q = p.quotations.find((x) => x.id === selQ)

  return (
    <div className="focus-toolbar" role="toolbar" aria-label="Commands">
      <button className="tb-file" onClick={() => ui.setBackstage(true)}>
        File
      </button>
      <span className="tb-sep" />
      {onDoc ? (
        <>
          <TB icon={<I.CreateFreeQuotationIcon />} label="Create quotation" disabled={!hasSel} onClick={p.createFreeQuotation} primary={locked && hasSel} />
          {!locked && (
            <>
              <TB icon={<I.ApplyCodesIcon />} label="Apply code" disabled={!hasSel && !selQ} onClick={() => ui.openApplyCodes()} title="Apply code (Ctrl+J)" />
              <TB icon={<I.InVivoIcon />} label="In vivo" disabled={!hasSel} onClick={p.codeInVivo} title="Use the selected words as the code name" />
              <TB
                icon={<I.QuickCodingIcon />}
                label="Quick code"
                disabled={!lastCode || (!hasSel && !selQ)}
                onClick={p.quickCode}
                title={lastCode ? `Apply “${lastCode.name}” again (Ctrl+L)` : 'Apply the last code again'}
              />
            </>
          )}
          <span className="tb-sep" />
          <TB
            icon={<I.CommentIcon />}
            label="Comment"
            disabled={!q}
            onClick={() => {
              if (!q) return
              const c = window.prompt(`Comment for quotation ${q.id}`, q.comment ?? '')
              if (c !== null) p.setQuotationComment(q.id, c)
            }}
          />
          <TB icon={<I.DeleteIcon />} label="Delete" disabled={!q} onClick={() => q && p.deleteQuotation(q.id)} title="Delete the selected quotation" />
        </>
      ) : (
        <span className="tb-hint">
          {focused?.kind === 'categories'
            ? 'Drag codes into categories, or use each code’s menu'
            : focused?.kind === 'network'
              ? 'Choose Link Nodes, then click a source and a target'
              : focused?.kind === 'ica'
                ? 'Classify each divergence, then choose an action'
                : ''}
        </span>
      )}
      <span className="tb-spacer" />
      <TB icon={<I.CodeIcon size={18} />} label="Codes" onClick={() => ui.setRail('codes')} />
      <TB icon={<I.PlayIcon />} label="Walkthrough" onClick={() => ui.setWalkthrough(true)} />
    </div>
  )
}
