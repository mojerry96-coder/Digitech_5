import { useEffect, useRef, useState } from 'react'
import { TitleBar, Ribbon, FocusToolbar } from './components/Ribbon'
import { ProjectExplorer } from './components/ProjectExplorer'
import { Workspace } from './components/Workspace'
import { ApplyCodesDialog, Backstage, ContextMenu, MergeCodesDialog, Toast } from './components/Dialogs'
import { useProject, tabKey } from './store/project'
import { useUI } from './store/ui'
import { PRODUCT_NAME } from './config'
import { CommentIcon } from './components/icons'
import { useSession, type Stage } from './sim/session'
import { Opener } from './screens/Opener'
import { Landing } from './screens/Landing'
import { Welcome } from './screens/Welcome'
import { Walkthrough } from './screens/Walkthrough'
import { HANDOFF, handoffMemoText } from './content/handoff'
import { TONE_COLOURS } from './sim/CasePanel'
import { Rail } from './sim/Rail'
import { codingLocked } from './sim/session'
import { Debrief } from './screens/Debrief'
import { FacilitatorView } from './sim/FacilitatorView'
import { checkpoint, recomputeEvidenceTrail } from './sim/flow'

const HANDOFF_MEMO_ID = 'MEMO-HANDOFF'

const meterTone = (v: number) => (v > 75 ? TONE_COLOURS.strong : v >= 40 ? TONE_COLOURS.developing : TONE_COLOURS.weak)

/** A restrained analytical status meter (not a point score); animates 350 ms and pulses on change. */
function Meter({ label, value, lockedNote }: { label: string; value: number | null; lockedNote: string }) {
  const [pulse, setPulse] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && value !== null) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 700)
      prev.current = value
      return () => clearTimeout(t)
    }
    prev.current = value
  }, [value])
  const col = value === null ? '#94A3B8' : meterTone(value)
  return (
    <span
      className={'meter' + (pulse ? ' pulse' : '')}
      style={{ ['--meter-col' as string]: col }}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? lockedNote : `${value}%`}
      title={value === null ? lockedNote : undefined}
    >
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${value ?? 0}%` }} />
      </span>
      <span className="meter-val">{value === null ? '—' : `${value}%`}</span>
    </span>
  )
}

/** Slim strip under the ribbon: the active objective and the analytical meters. */
function ObjectiveStrip() {
  const p = useProject()
  const s = useSession()
  const focus = useUI((u) => u.focusMode)
  const all = [
    { key: 'cb', label: 'Codebook Confidence', short: 'Codebook', value: s.meters.codebookConfidence, note: 'Set after first-pass coding', show: true },
    { key: 'cc', label: 'Category Coherence', short: 'Categories', value: s.meters.categoryCoherence, note: 'Set when categories are finished', show: s.sequence !== 'GP1' },
    { key: 'ti', label: 'Theme Integrity', short: 'Theme', value: s.meters.themeIntegrity, note: 'Set after the negative case', show: s.sequence !== 'GP1' },
  ].filter((m) => m.show)
  // focus mode: the meter that matters now is full size; earlier ones shrink to chips
  const primaryKey =
    s.sequence === 'GP1' ? 'cb' : s.sequence === 'GP2' ? (s.meters.categoryCoherence === null || s.gp2Phase === 'count' || s.gp2Phase === 'sort' ? 'cc' : 'ti') : 'ti'
  return (
    <div className="objective-strip" aria-label="Analytical status">
      <span className="os-label">Objective</span>
      <span className="os-objective">{HANDOFF.objective}</span>
      <span className="os-right">
        {s.flags.includes('field-tested-codebook') && <span className="badge-bonus">Field-Tested Codebook</span>}
        {focus
          ? all.map((m) =>
              m.key === primaryKey ? (
                <Meter key={m.key} label={m.label} value={m.value} lockedNote={m.note} />
              ) : (
                <span key={m.key} className="meter-chip" title={`${m.label}: ${m.value === null ? m.note : m.value + '%'}`} style={{ ['--meter-col' as string]: m.value === null ? '#94A3B8' : meterTone(m.value) }}>
                  <i /> {m.short} {m.value === null ? '—' : `${m.value}%`}
                </span>
              ),
            )
          : all.map((m) => <Meter key={m.key} label={m.label} value={m.value} lockedNote={m.note} />)}
        <button className="os-handoff" onClick={() => p.openTab({ kind: 'memo', id: HANDOFF_MEMO_ID }, 0)} title="Handoff note">
          <CommentIcon size={15} /> {focus ? 'Handoff' : 'Handoff note'}
        </button>
      </span>
    </div>
  )
}

function StatusBar() {
  const p = useProject()
  const sel = p.selection
  const q = p.selected?.kind === 'quotation' ? p.selected.id : null
  return (
    <footer className="statusbar">
      <span>{PRODUCT_NAME}</span>
      <span className="status-right">
        {sel ? `Selection: ${sel.end - sel.start} characters` : q ? `Quotation ${q}` : ''}
        <span className="status-user">{p.currentUser}</span>
      </span>
    </footer>
  )
}

export default function App() {
  const session = useSession()
  const go = (s: Stage) => session.setStage(s)

  // Dev link or a returning learner mid-session: bypass the opener (OPENER.md §7).
  useEffect(() => {
    if (session.stage === 'opener' && new URLSearchParams(location.search).has('skipintro')) go('landing')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Facilitator access from anywhere in the flow: /?facilitator
  if (new URLSearchParams(location.search).has('facilitator'))
    return (
      <div className="fac-page">
        <FacilitatorView />
      </div>
    )
  const params = new URLSearchParams(location.search)
  // Begin is the click that lets the walkthrough start with sound; ?nowalk goes straight on.
  if (session.stage === 'opener') return <Opener onBegin={() => go(params.has('nowalk') ? 'landing' : 'walkthrough')} />
  if (session.stage === 'walkthrough') return <Walkthrough auto onClose={() => go('landing')} />
  if (session.stage === 'landing') return <Landing onContinue={() => go('welcome')} />
  if (session.stage === 'welcome')
    return (
      <Welcome
        onOpen={() => {
          useProject.getState().beginCase(session.learnerName, {
            id: HANDOFF_MEMO_ID,
            title: `Handoff — ${HANDOFF.from}`,
            text: handoffMemoText(session.learnerName),
            draft: false,
            type: 'Handoff',
          })
          session.startCase()
          checkpoint('GP1')
        }}
      />
    )
  if (session.stage === 'ending') return <Debrief />
  return <Workbench />
}

function Workbench() {
  const ui = useUI()
  // focus mode: wide work surfaces (the interpretation map) get the Explorer's width
  const wideSurface = useProject((st) => {
    const g = st.groups[st.focusedGroup]
    return g.tabs.find((t) => tabKey(t) === g.active)?.kind === 'network'
  })
  // Evidence-trail completeness follows the interpretation map and codings live.
  useEffect(() => {
    recomputeEvidenceTrail()
    const a = useProject.subscribe(recomputeEvidenceTrail)
    return a
  }, [])

  // ATLAS.ti keyboard shortcuts: Ctrl+J apply codes, Ctrl+L quick coding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = e.key.toLowerCase()
      const p = useProject.getState()
      if ((k === 'j' || k === 'l') && codingLocked()) {
        e.preventDefault()
        useUI.getState().showToast('Coding opens after segmentation.')
      } else if (k === 'j' && (p.selection || p.selected?.kind === 'quotation')) {
        e.preventDefault()
        useUI.getState().openApplyCodes()
      } else if (k === 'l') {
        e.preventDefault()
        p.quickCode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={'app' + (ui.focusMode ? ' focus' : '')}>
      <TitleBar />
      {ui.focusMode ? <FocusToolbar /> : <Ribbon />}
      <ObjectiveStrip />
      <div className="main-area">
        {!(ui.focusMode && wideSurface) && <ProjectExplorer />}
        <Workspace />
        <Rail />
      </div>
      <StatusBar />
      <ApplyCodesDialog />
      <MergeCodesDialog />
      <ContextMenu />
      <Backstage />
      <Toast />
      {ui.walkthroughOpen && <Walkthrough auto={false} goLabel="Back to the simulation" onClose={() => ui.setWalkthrough(false)} />}
    </div>
  )
}
