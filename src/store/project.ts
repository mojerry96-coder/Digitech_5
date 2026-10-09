import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from './storage'
import { useUI } from './ui'
import { documents as sourceDocs, fieldNotes, type ParticipantId } from '../content/draftDataset'

export type CodeType = 'attitude' | 'behaviour' | 'internal' | 'structural' | 'meta'

/** Storyboard §10.5 code-type colours. */
export const CODE_TYPE_COLOURS: Record<CodeType, string> = {
  attitude: '#0EA5E9',
  behaviour: '#10B981',
  internal: '#A855F7',
  structural: '#F97316',
  meta: '#EC4899',
}

export const CODE_TYPE_LABELS: Record<CodeType, string> = {
  attitude: 'Stated attitude',
  behaviour: 'Behavioural / action',
  internal: 'Internal / psychological',
  structural: 'Structural / external',
  meta: 'Meta / process',
}

export interface Doc {
  id: number
  name: string
  participant: ParticipantId
  paragraphs: string[]
  draft: boolean
  groups: string[]
  comment?: string
}

export interface Quotation {
  /** ATLAS.ti style id: "docId:index", e.g. "2:3" */
  id: string
  docId: number
  index: number
  /** Character offsets into the document text (paragraphs joined with "\n"). */
  start: number
  end: number
  comment?: string
  createdBy: string
  created: number
}

export interface Code {
  id: string
  name: string
  type?: CodeType
  /** Offered by the inherited S1 environment; becomes a real code once applied. */
  suggested?: boolean
  comment?: string
  createdBy: string
  created: number
}

export interface Coding {
  quotationId: string
  codeId: string
  coder: string
}

export interface Memo {
  id: string
  title: string
  text: string[]
  draft: boolean
  type: 'Field note' | 'Memo' | 'Handoff'
  linkedDocId?: number
}

export interface CodeGroup {
  id: string
  name: string
  memberCodeIds: string[]
}

/* ---------- networks (ATLAS.ti Network editor) ---------- */
export type NodeKind = 'theme' | 'codeGroup' | 'code' | 'memo' | 'quotation'
export const RELATIONS = ['is part of', 'supports', 'contradicts', 'is associated with', 'is cause of'] as const
export type Relation = (typeof RELATIONS)[number]
export interface NetNode {
  id: string
  kind: NodeKind
  refId: string
  x: number
  y: number
}
export interface NetLink {
  id: string
  from: string
  to: string
  relation: Relation
}
export interface Network {
  id: string
  name: string
  nodes: NetNode[]
  links: NetLink[]
}
export const nodeId = (kind: NodeKind, refId: string) => `${kind}:${refId}`

export type TabRef =
  | { kind: 'overview' }
  | { kind: 'document'; id: number }
  | { kind: 'memo'; id: string }
  | { kind: 'codeManager' }
  | { kind: 'documentManager' }
  | { kind: 'quotationManager' }
  | { kind: 'ica' }
  | { kind: 'categories' }
  | { kind: 'stress' }
  | { kind: 'network'; id: string }
  | { kind: 'memoEditor' }
  | { kind: 'peerReview' }

export const tabKey = (t: TabRef) =>
  t.kind === 'document' ? `doc:${t.id}` : t.kind === 'memo' ? `memo:${t.id}` : t.kind === 'network' ? `net:${t.id}` : t.kind

export interface TabGroup {
  tabs: TabRef[]
  active: string | null
}

export interface TextSelection {
  docId: number
  start: number
  end: number
}

export type Selected =
  | { kind: 'quotation'; id: string }
  | { kind: 'code'; id: string }
  | { kind: 'document'; id: number }
  | { kind: 'memo'; id: string }
  | { kind: 'project' }
  | null

interface ProjectState {
  projectName: string
  currentUser: string
  docs: Doc[]
  quotations: Quotation[]
  codes: Code[]
  codings: Coding[]
  memos: Memo[]
  codeGroups: CodeGroup[]
  networks: Network[]
  documentGroups: string[]
  lastUsedCodeId: string | null

  // workspace (UI) state
  groups: [TabGroup, TabGroup]
  focusedGroup: 0 | 1
  selection: TextSelection | null
  selected: Selected

  // workspace actions
  openTab: (t: TabRef, group?: 0 | 1) => void
  closeTab: (group: 0 | 1, key: string) => void
  activateTab: (group: 0 | 1, key: string) => void
  setSelection: (s: TextSelection | null) => void
  select: (s: Selected) => void

  // entity actions
  createQuotation: (s: TextSelection) => Quotation
  deleteQuotation: (id: string) => void
  setQuotationComment: (id: string, comment: string) => void
  createCode: (name: string, type?: CodeType) => Code
  addSuggestedCodes: (list: { name: string; type?: CodeType }[]) => void
  removeUnusedSuggested: () => void
  addDocument: (doc: Doc) => void
  renameCode: (id: string, name: string) => void
  setCodeType: (id: string, type: CodeType | undefined) => void
  setCodeComment: (id: string, comment: string) => void
  deleteCode: (id: string) => void
  mergeCodes: (targetId: string, sourceIds: string[]) => void
  applyCode: (quotationId: string, codeId: string) => void
  unlinkCode: (quotationId: string, codeId: string) => void
  /** Selection or existing quotation → quotation, then code it. */
  codeSelection: (codeId: string) => void
  codeInVivo: () => void
  quickCode: () => void
  createFreeQuotation: () => void
  resetProject: () => void
  setCodeGroups: (groups: CodeGroup[]) => void
  addMemo: (m: Memo) => void
  ensureNetwork: (id: string, name: string) => void
  addNode: (netId: string, kind: NodeKind, refId: string, x: number, y: number) => void
  moveNode: (netId: string, nodeId: string, x: number, y: number) => void
  removeNode: (netId: string, nodeId: string) => void
  addLink: (netId: string, from: string, to: string, relation: Relation) => void
  removeLink: (netId: string, linkId: string) => void
  /** Restore a saved snapshot (replay checkpoints). */
  restore: (snapshot: Partial<ProjectState>) => void
  /** Case handoff: the learner becomes the project's current user and the handoff is filed as a memo. */
  beginCase: (learnerName: string, handoff: Memo) => void
}

const docText = (d: Doc) => d.paragraphs.join('\n')

const initialDocs = (): Doc[] =>
  sourceDocs
    .filter((d) => !d.gated)
    .map((d, i) => ({
      id: i + 1,
      name: d.title,
      participant: d.participant,
      paragraphs: d.paragraphs,
      draft: d.draft,
      groups: [d.year, d.faculty],
    }))

const initialMemos = (): Memo[] =>
  fieldNotes.map((n) => ({
    id: n.id,
    title: n.title,
    text: n.text,
    draft: n.draft,
    type: 'Field note',
    linkedDocId: sourceDocs.filter((d) => !d.gated).findIndex((d) => d.participant === n.linkedParticipant) + 1,
  }))

const initialData = () => {
  const docs = initialDocs()
  return {
    projectName: 'Student Wellbeing Access Study',
    currentUser: 'Lead Coder',
    docs,
    quotations: [] as Quotation[],
    codes: [] as Code[],
    codings: [] as Coding[],
    memos: initialMemos(),
    codeGroups: [] as CodeGroup[],
    networks: [] as Network[],
    documentGroups: [...new Set(docs.flatMap((d) => d.groups))],
    lastUsedCodeId: null as string | null,
    groups: [
      { tabs: [{ kind: 'overview' } as TabRef], active: 'overview' },
      { tabs: [], active: null },
    ] as [TabGroup, TabGroup],
    focusedGroup: 0 as 0 | 1,
    selection: null as TextSelection | null,
    selected: { kind: 'project' } as Selected,
  }
}

let idCounter = Date.now()
const uid = (p: string) => `${p}${(idCounter++).toString(36)}`

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      openTab: (t, group) => {
        // Focus mode: one work surface at a time. The Code Manager lives in the right rail,
        // nothing opens side by side, and only the three most recent tabs stay open.
        const ui = useUI.getState()
        if (ui.focusMode) {
          if (t.kind === 'codeManager') return ui.setRail('codes')
          group = 0
        }
        const key = tabKey(t)
        set((s) => {
          const groups = s.groups.map((g) => ({ ...g, tabs: [...g.tabs] })) as [TabGroup, TabGroup]
          // already open somewhere → just activate it
          for (const gi of [0, 1] as const) {
            if (groups[gi].tabs.some((x) => tabKey(x) === key)) {
              groups[gi].active = key
              return { groups, focusedGroup: gi }
            }
          }
          const target = group ?? s.focusedGroup
          groups[target].tabs.push(t)
          groups[target].active = key
          if (ui.focusMode) {
            groups[1] = { tabs: [], active: null }
            while (groups[0].tabs.length > 3) groups[0].tabs.shift()
          }
          return { groups, focusedGroup: target }
        })
      },
      closeTab: (gi, key) =>
        set((s) => {
          const groups = s.groups.map((g) => ({ ...g, tabs: [...g.tabs] })) as [TabGroup, TabGroup]
          const g = groups[gi]
          const idx = g.tabs.findIndex((x) => tabKey(x) === key)
          if (idx < 0) return {}
          g.tabs.splice(idx, 1)
          if (g.active === key) g.active = g.tabs.length ? tabKey(g.tabs[Math.max(0, idx - 1)]) : null
          // an empty right-hand group collapses back into a single pane
          return { groups, focusedGroup: groups[1].tabs.length ? s.focusedGroup : 0 }
        }),
      activateTab: (gi, key) =>
        set((s) => {
          const groups = s.groups.map((g) => ({ ...g })) as [TabGroup, TabGroup]
          groups[gi].active = key
          return { groups, focusedGroup: gi }
        }),
      setSelection: (selection) => set({ selection }),
      select: (selected) => set({ selected }),

      createQuotation: ({ docId, start, end }) => {
        const s = get()
        const existing = s.quotations.find((q) => q.docId === docId && q.start === start && q.end === end)
        if (existing) return existing
        const index = s.quotations.filter((q) => q.docId === docId).reduce((m, q) => Math.max(m, q.index), 0) + 1
        const q: Quotation = {
          id: `${docId}:${index}`,
          docId,
          index,
          start,
          end,
          createdBy: s.currentUser,
          created: Date.now(),
        }
        set({ quotations: [...s.quotations, q], selected: { kind: 'quotation', id: q.id } })
        return q
      },
      deleteQuotation: (id) =>
        set((s) => ({
          quotations: s.quotations.filter((q) => q.id !== id),
          codings: s.codings.filter((c) => c.quotationId !== id),
          selected: s.selected?.kind === 'quotation' && s.selected.id === id ? null : s.selected,
        })),
      setQuotationComment: (id, comment) =>
        set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, comment } : q)) })),

      createCode: (name, type) => {
        const s = get()
        const trimmed = name.trim()
        const existing = s.codes.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
        if (existing) return existing
        const c: Code = { id: uid('c'), name: trimmed, type, createdBy: s.currentUser, created: Date.now() }
        set({ codes: [...s.codes, c] })
        return c
      },
      addSuggestedCodes: (list) =>
        set((s) => ({
          codes: [
            ...s.codes,
            ...list
              .filter((x) => !s.codes.some((c) => c.name.toLowerCase() === x.name.toLowerCase()))
              .map((x) => ({
                id: uid('c'),
                name: x.name,
                type: x.type,
                suggested: true,
                createdBy: 'Lead Researcher',
                created: Date.now(),
              })),
          ],
        })),
      removeUnusedSuggested: () =>
        set((s) => ({ codes: s.codes.filter((c) => !c.suggested || s.codings.some((k) => k.codeId === c.id)) })),
      addDocument: (doc) =>
        set((s) => ({
          docs: s.docs.some((d) => d.id === doc.id) ? s.docs : [...s.docs, doc],
          documentGroups: [...new Set([...s.documentGroups, ...doc.groups])],
        })),
      renameCode: (id, name) => set((s) => ({ codes: s.codes.map((c) => (c.id === id ? { ...c, name } : c)) })),
      setCodeType: (id, type) => set((s) => ({ codes: s.codes.map((c) => (c.id === id ? { ...c, type } : c)) })),
      setCodeComment: (id, comment) =>
        set((s) => ({ codes: s.codes.map((c) => (c.id === id ? { ...c, comment } : c)) })),
      deleteCode: (id) =>
        set((s) => ({
          codes: s.codes.filter((c) => c.id !== id),
          codings: s.codings.filter((c) => c.codeId !== id),
          codeGroups: s.codeGroups.map((g) => ({ ...g, memberCodeIds: g.memberCodeIds.filter((m) => m !== id) })),
          selected: s.selected?.kind === 'code' && s.selected.id === id ? null : s.selected,
        })),
      mergeCodes: (targetId, sourceIds) =>
        set((s) => {
          const sources = new Set(sourceIds.filter((x) => x !== targetId))
          const codings: Coding[] = []
          for (const c of s.codings) {
            const codeId = sources.has(c.codeId) ? targetId : c.codeId
            if (!codings.some((x) => x.quotationId === c.quotationId && x.codeId === codeId && x.coder === c.coder))
              codings.push({ ...c, codeId })
          }
          const target = s.codes.find((c) => c.id === targetId)
          const mergedComments = [target?.comment, ...s.codes.filter((c) => sources.has(c.id)).map((c) => c.comment)]
            .filter(Boolean)
            .join('\n\n')
          return {
            codings,
            codes: s.codes
              .filter((c) => !sources.has(c.id))
              .map((c) => (c.id === targetId ? { ...c, comment: mergedComments || undefined } : c)),
            codeGroups: s.codeGroups.map((g) => ({
              ...g,
              memberCodeIds: [...new Set(g.memberCodeIds.map((m) => (sources.has(m) ? targetId : m)))],
            })),
          }
        }),
      applyCode: (quotationId, codeId) =>
        set((s) => {
          // a suggestion becomes a real code the moment it is used
          const codes = s.codes.some((c) => c.id === codeId && c.suggested)
            ? s.codes.map((c) => (c.id === codeId ? { ...c, suggested: false, createdBy: s.currentUser } : c))
            : s.codes
          if (s.codings.some((c) => c.quotationId === quotationId && c.codeId === codeId && c.coder === s.currentUser))
            return { lastUsedCodeId: codeId, codes }
          return {
            codes,
            codings: [...s.codings, { quotationId, codeId, coder: s.currentUser }],
            lastUsedCodeId: codeId,
          }
        }),
      unlinkCode: (quotationId, codeId) =>
        set((s) => ({ codings: s.codings.filter((c) => !(c.quotationId === quotationId && c.codeId === codeId)) })),

      codeSelection: (codeId) => {
        const s = get()
        let qid: string | null = null
        if (s.selection) qid = s.createQuotation(s.selection).id
        else if (s.selected?.kind === 'quotation') qid = s.selected.id
        if (!qid) return
        get().applyCode(qid, codeId)
        set({ selection: null, selected: { kind: 'quotation', id: qid } })
      },
      codeInVivo: () => {
        const s = get()
        if (!s.selection) return
        const doc = s.docs.find((d) => d.id === s.selection!.docId)
        if (!doc) return
        const text = docText(doc).slice(s.selection.start, s.selection.end).replace(/\s+/g, ' ').trim()
        if (!text) return
        const label = `“${text.length > 60 ? text.slice(0, 60).trim() + '…' : text}”`
        const code = get().createCode(label)
        get().codeSelection(code.id)
      },
      quickCode: () => {
        const id = get().lastUsedCodeId
        if (id && get().codes.some((c) => c.id === id)) get().codeSelection(id)
      },
      createFreeQuotation: () => {
        const s = get()
        if (!s.selection) return
        s.createQuotation(s.selection)
        set({ selection: null })
      },
      resetProject: () => set(initialData()),
      setCodeGroups: (codeGroups) => set({ codeGroups }),
      addMemo: (m) => set((s) => ({ memos: s.memos.some((x) => x.id === m.id) ? s.memos.map((x) => (x.id === m.id ? m : x)) : [...s.memos, m] })),
      ensureNetwork: (id, name) =>
        set((s) => (s.networks.some((n) => n.id === id) ? {} : { networks: [...s.networks, { id, name, nodes: [], links: [] }] })),
      addNode: (netId, kind, refId, x, y) =>
        set((s) => ({
          networks: s.networks.map((n) =>
            n.id !== netId || n.nodes.some((x) => x.id === nodeId(kind, refId))
              ? n
              : { ...n, nodes: [...n.nodes, { id: nodeId(kind, refId), kind, refId, x, y }] },
          ),
        })),
      moveNode: (netId, id, x, y) =>
        set((s) => ({
          networks: s.networks.map((n) => (n.id !== netId ? n : { ...n, nodes: n.nodes.map((k) => (k.id === id ? { ...k, x, y } : k)) })),
        })),
      removeNode: (netId, id) =>
        set((s) => ({
          networks: s.networks.map((n) =>
            n.id !== netId ? n : { ...n, nodes: n.nodes.filter((k) => k.id !== id), links: n.links.filter((l) => l.from !== id && l.to !== id) },
          ),
        })),
      addLink: (netId, from, to, relation) =>
        set((s) => ({
          networks: s.networks.map((n) =>
            n.id !== netId || from === to || n.links.some((l) => l.from === from && l.to === to)
              ? n
              : { ...n, links: [...n.links, { id: uid('l'), from, to, relation }] },
          ),
        })),
      removeLink: (netId, linkId) =>
        set((s) => ({ networks: s.networks.map((n) => (n.id !== netId ? n : { ...n, links: n.links.filter((l) => l.id !== linkId) })) })),
      restore: (snapshot) => set({ ...snapshot, selection: null }),
      beginCase: (learnerName, handoff) =>
        set((s) => ({
          currentUser: learnerName || s.currentUser,
          memos: s.memos.some((m) => m.id === handoff.id) ? s.memos : [handoff, ...s.memos],
          groups: [
            { tabs: [{ kind: 'overview' }], active: 'overview' },
            { tabs: [], active: null },
          ],
          focusedGroup: 0,
          selected: { kind: 'project' },
        })),
    }),
    {
      name: 'qcs-project-v1',
      storage: createJSONStorage(safeStorage),
      partialize: (s) => {
        // the live text selection is transient
        const { selection: _sel, ...rest } = s
        return rest
      },
    },
  ),
)

export const getDocText = docText

/** Quotation "name" as ATLAS.ti shows it: the first words of the quoted text. */
export function quotationLabel(q: Quotation, docs: Doc[]) {
  const d = docs.find((x) => x.id === q.docId)
  if (!d) return q.id
  const t = docText(d).slice(q.start, q.end).replace(/\s+/g, ' ').trim()
  return t
}

export function codeColour(c: Code | undefined) {
  return c?.type ? CODE_TYPE_COLOURS[c.type] : undefined
}

/** Groundedness = number of quotations the code is linked to. */
export function groundedness(codeId: string, codings: Coding[]) {
  return new Set(codings.filter((c) => c.codeId === codeId).map((c) => c.quotationId)).size
}
