/**
 * Sequence-level flow: replay checkpoints, evidence-trail completeness, and
 * the hand-off from the workspace to the ending (Sequence 5).
 */
import { useProject } from '../store/project'
import { useSession, type Sequence, type SceneId } from './session'
import { checkJigsaw } from './analysis'

export const MAP_ID = 'NET-MAP'
export const FIELD_NOTE_IDS = ['FN-P2', 'FN-P5']

const data = <T extends object>(o: T) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === 'function' ? undefined : v)))

/** Snapshot project + session at the start of a major gameplay sequence (replay points). */
export function checkpoint(seq: Sequence) {
  const p = data(useProject.getState())
  const { checkpoints, ...rest } = data(useSession.getState())
  void checkpoints
  useSession.getState().patch({
    checkpoints: { ...useSession.getState().checkpoints, [seq]: { project: p, session: rest, at: Date.now() } },
  })
}

export function replayFrom(seq: Sequence) {
  const s = useSession.getState()
  const cp = s.checkpoints[seq]
  if (!cp) return
  const keep = { checkpoints: s.checkpoints, learnerId: s.learnerId, learnerName: s.learnerName }
  useProject.getState().restore(cp.project as never)
  useSession.getState().patch({ ...(cp.session as object), ...keep, stage: 'workspace', simulationComplete: false })
  useSession.getState().log('replay', `Replay from ${seq}`)
}

export function enterScene(id: SceneId) {
  const s = useSession.getState()
  if (!s.sceneHistory.includes(id)) s.patch({ sceneHistory: [...s.sceneHistory, id] })
}

/** Field-note memos linked to the theme on the interpretation map. */
export function fieldNotesLinked() {
  const net = useProject.getState().networks.find((n) => n.id === MAP_ID)
  if (!net) return 0
  return FIELD_NOTE_IDS.filter((id) =>
    net.links.some((l) => (l.from === `memo:${id}` && l.to === 'theme:THEME') || (l.to === `memo:${id}` && l.from === 'theme:THEME')),
  ).length
}

/**
 * Evidence-trail completeness: jigsaw links carry most of the weight; optional
 * field-note links add the rest. Field notes never change the S5 tier.
 */
export function recomputeEvidenceTrail() {
  const p = useProject.getState()
  const s = useSession.getState()
  const net = p.networks.find((n) => n.id === MAP_ID)
  const jig = s.sequence === 'GP3' ? checkJigsaw(net, p.codeGroups, p.quotations, p.codings, p.docs).completeness : 0
  const fn = fieldNotesLinked()
  const etc = Math.round(100 * (0.8 * jig + 0.2 * (fn / FIELD_NOTE_IDS.length)))
  const used = fn > 0
  if (etc !== s.meters.evidenceTrailCompleteness || used !== !!s.branchState.S5_fieldNotesUsed || jig !== s.jigsawCompleteness) {
    s.patch({
      meters: { ...s.meters, evidenceTrailCompleteness: etc },
      jigsawCompleteness: jig,
      branchState: s.sequence === 'GP1' ? s.branchState : { ...s.branchState, S5_fieldNotesUsed: used || !!s.branchState.S5_fieldNotesUsed },
    })
  }
}

export function finishSimulation() {
  enterScene('ENDING')
  const s = useSession.getState()
  s.patch({ simulationComplete: true, stage: 'ending' })
  s.log('ending', 'Report packet submitted to the Dean; debrief opened.')
}

/** Wide working surfaces (bins, network) get the full width: close the side-by-side Code Manager. */
export function closeSideCodeManager() {
  const p = useProject.getState()
  if (p.groups[1].tabs.some((t) => t.kind === 'codeManager')) p.closeTab(1, 'codeManager')
}

export function openMapFullWidth() {
  closeSideCodeManager()
  useProject.getState().openTab({ kind: 'network', id: MAP_ID }, 0)
}

export function openBinsFullWidth() {
  closeSideCodeManager()
  useProject.getState().openTab({ kind: 'categories' }, 0)
}
