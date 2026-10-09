import { useProject, tabKey, type TabRef } from '../store/project'
import { DocumentViewer } from './DocumentViewer'
import { CodeManager, DocumentManager, MemoViewer, ProjectOverview, QuotationManager } from './Managers'
import { IcaView } from '../sim/IcaView'
import { CategoryBoard, StressTest } from '../sim/Gameplay2Views'
import { MemoEditor, PeerReview } from '../sim/Gameplay3Views'
import { NetworkEditor } from './NetworkEditor'
import * as I from './icons'

function tabTitle(
  t: TabRef,
  docs: { id: number; name: string }[],
  memos: { id: string; title: string }[],
  networks: { id: string; name: string }[],
): { icon: JSX.Element; label: string } {
  switch (t.kind) {
    case 'overview':
      return { icon: <I.ProjectIcon size={14} />, label: 'Project Overview' }
    case 'document': {
      const d = docs.find((x) => x.id === t.id)
      return { icon: <I.DocIcon size={14} />, label: `D${t.id}: ${d?.name ?? ''}` }
    }
    case 'memo':
      return { icon: <I.FieldNoteIcon size={14} />, label: memos.find((m) => m.id === t.id)?.title ?? 'Memo' }
    case 'codeManager':
      return { icon: <I.CodeManagerIcon size={14} />, label: 'Code Manager' }
    case 'documentManager':
      return { icon: <I.DocManagerIcon size={14} />, label: 'Document Manager' }
    case 'quotationManager':
      return { icon: <I.QuotationManagerIcon size={14} />, label: 'Quotation Manager' }
    case 'ica':
      return { icon: <I.GenericIcon glyph="≈" size={14} />, label: 'Intercoder Agreement' }
    case 'categories':
      return { icon: <I.CodeGroupIcon size={14} />, label: 'Sort into Bins' }
    case 'stress':
      return { icon: <I.GenericIcon glyph="⚖" size={14} />, label: 'Theme stress test' }
    case 'network':
      return { icon: <I.NetworkIcon size={14} />, label: networks.find((n) => n.id === t.id)?.name ?? 'Network' }
    case 'memoEditor':
      return { icon: <I.MemoIcon size={14} />, label: 'Interpretation memo' }
    case 'peerReview':
      return { icon: <I.CommentIcon size={14} />, label: 'Supervisor Challenge Memo' }
  }
}

function TabBody({ t }: { t: TabRef }) {
  switch (t.kind) {
    case 'overview':
      return <ProjectOverview />
    case 'document':
      return <DocumentViewer docId={t.id} />
    case 'memo':
      return <MemoViewer memoId={t.id} />
    case 'codeManager':
      return <CodeManager />
    case 'documentManager':
      return <DocumentManager />
    case 'quotationManager':
      return <QuotationManager />
    case 'ica':
      return <IcaView />
    case 'categories':
      return <CategoryBoard />
    case 'stress':
      return <StressTest />
    case 'network':
      return <NetworkEditor netId={t.id} />
    case 'memoEditor':
      return <MemoEditor />
    case 'peerReview':
      return <PeerReview />
  }
}

function TabGroupView({ gi }: { gi: 0 | 1 }) {
  const p = useProject()
  const g = p.groups[gi]
  const active = g.tabs.find((t) => tabKey(t) === g.active)
  return (
    <section
      className={'tab-group' + (p.focusedGroup === gi ? ' focused' : '')}
      onMouseDown={() => p.focusedGroup !== gi && useProject.setState({ focusedGroup: gi })}
    >
      <div className="tab-strip" role="tablist">
        {g.tabs.map((t) => {
          const key = tabKey(t)
          const { icon, label } = tabTitle(t, p.docs, p.memos, p.networks)
          const on = key === g.active
          return (
            <div
              key={key}
              role="tab"
              aria-selected={on}
              tabIndex={0}
              className={'doc-tab' + (on ? ' active' : '')}
              onClick={() => p.activateTab(gi, key)}
              onKeyDown={(e) => e.key === 'Enter' && p.activateTab(gi, key)}
              onAuxClick={(e) => e.button === 1 && p.closeTab(gi, key)}
              title={label}
            >
              {icon}
              <span className="doc-tab-label">{label}</span>
              <span className="doc-tab-menu" aria-hidden="true">
                <I.ChevronDown size={7} />
              </span>
              <button
                className="doc-tab-close"
                aria-label={`Close ${label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  p.closeTab(gi, key)
                }}
              >
                <I.CloseIcon size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="tab-body">{active ? <TabBody t={active} /> : <div className="empty-view watermark" />}</div>
    </section>
  )
}

export function Workspace() {
  const split = useProject((s) => s.groups[1].tabs.length > 0)
  return (
    <main className={'workspace' + (split ? ' split' : '')}>
      <TabGroupView gi={0} />
      {split && <TabGroupView gi={1} />}
    </main>
  )
}
