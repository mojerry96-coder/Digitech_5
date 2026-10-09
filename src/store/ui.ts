import { create } from 'zustand'

export type RibbonTab =
  | 'Home'
  | 'Search & Code'
  | 'Analyze'
  | 'Import & Export'
  | 'Tools'
  | 'Help'
  | 'Document'
  | 'Code Manager'
  | 'View'

export interface MenuItem {
  label: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
  separator?: boolean
}

interface UIState {
  ribbonTab: RibbonTab
  backstageOpen: boolean
  /** Screen position for the Apply Codes dialog (anchored near the selection). */
  applyCodes: { x: number; y: number } | null
  /** Where the last text selection ended, so dialogs open beside it. */
  anchor: { x: number; y: number } | null
  contextMenu: { x: number; y: number; items: MenuItem[] } | null
  mergeDialog: { targetId?: string; sourceIds: string[] } | null
  renameCode: string | null
  toast: string | null
  walkthroughOpen: boolean
  setWalkthrough: (open: boolean) => void
  focusMode: boolean
  setFocusMode: (on: boolean) => void
  rail: 'task' | 'codes'
  setRail: (r: 'task' | 'codes') => void
  /** Screen rectangle of the live text selection (for the floating selection bar). */
  selRect: { left: number; top: number; bottom: number; right: number } | null
  setSelRect: (r: UIState['selRect']) => void
  setRibbonTab: (t: RibbonTab) => void
  setAnchor: (a: { x: number; y: number } | null) => void
  setBackstage: (open: boolean) => void
  openApplyCodes: (pos?: { x: number; y: number }) => void
  closeApplyCodes: () => void
  openContextMenu: (x: number, y: number, items: MenuItem[]) => void
  closeContextMenu: () => void
  openMerge: (d: { targetId?: string; sourceIds: string[] }) => void
  closeMerge: () => void
  setRenameCode: (id: string | null) => void
  showToast: (t: string) => void
}

let toastTimer: number | undefined

/** Focus mode is a per-viewer preference (on by default); "Show classic layout" turns it off. */
const readFocus = () => {
  try {
    return localStorage.getItem('qcs-full-atlas') !== '1'
  } catch {
    return true
  }
}

export const useUI = create<UIState>()((set) => ({
  ribbonTab: 'Home',
  backstageOpen: false,
  applyCodes: null,
  anchor: null,
  contextMenu: null,
  mergeDialog: null,
  renameCode: null,
  toast: null,
  walkthroughOpen: false,
  setWalkthrough: (walkthroughOpen) => set({ walkthroughOpen }),
  focusMode: readFocus(),
  setFocusMode: (focusMode) => {
    try {
      if (focusMode) localStorage.removeItem('qcs-full-atlas')
      else localStorage.setItem('qcs-full-atlas', '1')
    } catch {
      /* preference only */
    }
    set({ focusMode })
  },
  rail: 'task',
  setRail: (rail) => set({ rail }),
  selRect: null,
  setSelRect: (selRect) => set({ selRect }),
  setRibbonTab: (ribbonTab) => set({ ribbonTab }),
  setAnchor: (anchor) => set({ anchor }),
  setBackstage: (backstageOpen) => set({ backstageOpen }),
  openApplyCodes: (pos) =>
    set((s) => ({
      applyCodes: pos ?? s.anchor ?? { x: Math.round(window.innerWidth / 2 - 180), y: 180 },
      contextMenu: null,
    })),
  closeApplyCodes: () => set({ applyCodes: null }),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openMerge: (mergeDialog) => set({ mergeDialog }),
  closeMerge: () => set({ mergeDialog: null }),
  setRenameCode: (renameCode) => set({ renameCode }),
  showToast: (toast) => {
    window.clearTimeout(toastTimer)
    set({ toast })
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
  },
}))
