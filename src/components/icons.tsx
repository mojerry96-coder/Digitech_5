import type { CSSProperties } from 'react'
import * as Ph from '@phosphor-icons/react'

/**
 * One icon family: Phosphor (the house set used by the Fix the Prompt opener).
 * - Entity icons (document, quotation, code, memo, network…) use the duotone weight in a muted
 *   ATLAS.ti entity colour: the colour survives as a soft tint, not clip-art.
 * - Command icons are monochrome (currentColor), regular weight; fill/bold only for active states.
 * Export names are kept from the earlier hand-drawn set so every screen switches at once.
 */
type P = { size?: number; color?: string; className?: string; style?: CSSProperties; weight?: Ph.IconWeight }

export const ENTITY = {
  document: '#3B82F6',
  quotation: '#E07A16',
  code: '#22A06B',
  memo: '#D9468A',
  network: '#7C5CD6',
  link: '#2F7BD8',
  project: '#64748B',
  theme: '#8B5CF6',
}

const entity =
  (Icon: Ph.Icon, colour: string) =>
  ({ size = 16, color, weight = 'duotone', ...rest }: P) => <Icon size={size} color={color ?? colour} weight={weight} aria-hidden {...rest} />

const cmd =
  (Icon: Ph.Icon) =>
  ({ size = 18, weight = 'regular', ...rest }: P) => <Icon size={size} weight={weight} aria-hidden {...rest} />

/* ---------- entities ---------- */
export const DocIcon = entity(Ph.FileText, ENTITY.document)
export const QuotationIcon = entity(Ph.Quotes, ENTITY.quotation)
export const CodeIcon = entity(Ph.Diamond, ENTITY.code)
export const MemoIcon = entity(Ph.NotePencil, ENTITY.memo)
export const FieldNoteIcon = entity(Ph.Notebook, ENTITY.memo)
export const NetworkIcon = entity(Ph.Graph, ENTITY.network)
export const LinkIcon = entity(Ph.LinkSimple, ENTITY.link)
export const DocGroupIcon = entity(Ph.Files, ENTITY.document)
export const CodeGroupIcon = entity(Ph.Stack, ENTITY.code)
export const MemoGroupIcon = entity(Ph.Notepad, ENTITY.memo)
export const NetworkGroupIcon = entity(Ph.TreeStructure, ENTITY.network)
export const ProjectIcon = entity(Ph.FolderSimple, ENTITY.project)
export const ThemeIcon = entity(Ph.Lightbulb, ENTITY.theme)

/* ---------- managers (entity colour, larger in the full ribbon) ---------- */
export const DocManagerIcon = entity(Ph.FileText, ENTITY.document)
export const QuotationManagerIcon = entity(Ph.Quotes, ENTITY.quotation)
export const CodeManagerIcon = entity(Ph.Diamond, ENTITY.code)
export const MemoManagerIcon = entity(Ph.NotePencil, ENTITY.memo)
export const NetworkManagerIcon = entity(Ph.Graph, ENTITY.network)
export const LinkManagerIcon = entity(Ph.LinkSimple, ENTITY.link)

/* ---------- commands ---------- */
export const AddDocumentsIcon = cmd(Ph.FilePlus)
export const NewEntitiesIcon = cmd(Ph.PlusCircle)
export const CommentIcon = cmd(Ph.ChatCircleText)
export const NavigatorIcon = cmd(Ph.SidebarSimple)
export const CreateFreeQuotationIcon = cmd(Ph.Highlighter)
export const ApplyCodesIcon = cmd(Ph.Tag)
export const InVivoIcon = cmd(Ph.TextAa)
export const QuickCodingIcon = cmd(Ph.Lightning)
export const SearchCodeIcon = cmd(Ph.ListMagnifyingGlass)
export const RenameIcon = cmd(Ph.PencilSimple)
export const DeleteIcon = cmd(Ph.Trash)
export const UnlinkIcon = cmd(Ph.LinkBreak)
export const EditCommentIcon = cmd(Ph.ChatCircleText)
export const MergeIcon = cmd(Ph.ArrowsMerge)
export const NewCodeIcon = cmd(Ph.Plus)
export const ColourIcon = cmd(Ph.Palette)
export const PrintIcon = cmd(Ph.Printer)
export const PlayIcon = cmd(Ph.PlayCircle)
export const HelpIcon = cmd(Ph.Question)
export const CloseIcon = cmd(Ph.X)
export const ClockIcon = cmd(Ph.Clock)
export const CheckIcon = cmd(Ph.CheckCircle)
export const WarnIcon = cmd(Ph.WarningCircle)
export const InfoIcon = cmd(Ph.Info)
export const ArrowRightIcon = cmd(Ph.ArrowRight)
export const SoundIcon = cmd(Ph.SpeakerHigh)
export const SkipIcon = cmd(Ph.SkipForward)
export const GearIcon = cmd(Ph.GearSix)
export const FolderPlusIcon = cmd(Ph.FolderPlus)
export const DownloadIcon = cmd(Ph.DownloadSimple)
export const CloudIcon = cmd(Ph.Cloud)
export const DotsIcon = cmd(Ph.DotsThree)
export const CaretUpIcon = cmd(Ph.CaretUp)
export const CaretDownIcon = cmd(Ph.CaretDown)
export const SidebarIcon = cmd(Ph.SidebarSimple)
export const UsersIcon = cmd(Ph.UsersThree)
export const ScalesIcon = cmd(Ph.Scales)
export const SparkleIcon = cmd(Ph.Sparkle)
export const FunnelIcon = cmd(Ph.FunnelSimple)
export const TableIcon = cmd(Ph.Table)
export const ExportIcon = cmd(Ph.Export)
export const UploadIcon = cmd(Ph.UploadSimple)
export const ChartIcon = cmd(Ph.ChartBar)
export const GridIcon = cmd(Ph.GridFour)
export const EyeIcon = cmd(Ph.Eye)
export const UserIcon = cmd(Ph.User)
export const CalendarIcon = cmd(Ph.CalendarBlank)
export const PencilLineIcon = cmd(Ph.PencilLine)
export const UndoIcon = cmd(Ph.ArrowCounterClockwise)
export const RedoIcon = cmd(Ph.ArrowClockwise)
export const SaveIcon = cmd(Ph.FloppyDisk)
export const MinusIcon = cmd(Ph.Minus)
export const SquareIcon = cmd(Ph.Square)

/** Kept for compatibility: earlier placeholders passed a text glyph; each now maps to a real icon. */
const GLYPHS: Record<string, Ph.Icon> = {
  FG: Ph.UsersThree, AI: Ph.Sparkle, IA: Ph.Sparkle, 'Σ': Ph.TextAlignLeft, '.*': Ph.Asterisk, NE: Ph.Tag,
  '☺': Ph.Smiley, C: Ph.Lightbulb, OM: Ph.ChatCircleDots, W: Ph.ChartBar, '⊞': Ph.GridFour, '▦': Ph.Table,
  '?': Ph.Question, '◇': Ph.Diamond, '⇩': Ph.DownloadSimple, '⇧': Ph.UploadSimple, SP: Ph.ChartBar, X: Ph.Table,
  '👤': Ph.UserGear, '≡': Ph.ListChecks, '▶': Ph.PlayCircle, '¶': Ph.Paragraph, '▥': Ph.SidebarSimple,
  '≈': Ph.UsersThree, '⚖': Ph.Scales,
}
export const GenericIcon = ({ glyph, size = 18, ...rest }: P & { glyph: string }) => {
  const Icon = GLYPHS[glyph] ?? Ph.Square
  return <Icon size={size} weight="regular" aria-hidden {...rest} />
}

/** The workspace mark: MIVA amber code-diamond on a white disc (our own mark, no third-party logo). */
export const AppGlyph = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="14" fill="#fff" />
    <path d="M16 7.5 24.5 16 16 24.5 7.5 16Z" fill="#EE9B01" />
    <path d="M16 12.5 19.5 16 16 19.5 12.5 16Z" fill="#09314F" />
  </svg>
)

export const ChevronRight = ({ size = 12, ...rest }: P) => <Ph.CaretRight size={size} weight="bold" aria-hidden {...rest} />
export const ChevronDown = ({ size = 12, ...rest }: P) => <Ph.CaretDown size={size} weight="bold" aria-hidden {...rest} />
export const SearchGlyph = ({ size = 15, ...rest }: P) => <Ph.MagnifyingGlass size={size} aria-hidden {...rest} />
