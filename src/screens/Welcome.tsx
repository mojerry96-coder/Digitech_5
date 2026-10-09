import { useState } from 'react'
import { useSession, initials } from '../sim/session'
import { useProject } from '../store/project'
import { HANDOFF } from '../content/handoff'
import { PRODUCT_NAME } from '../config'
import { AppGlyph, SearchGlyph, ChevronDown, MinusIcon, SquareIcon, CloseIcon, GearIcon, FolderPlusIcon, DownloadIcon, CloudIcon, DotsIcon, CaretDownIcon } from '../components/icons'

/**
 * ATLAS.ti Welcome Screen (Windows) — left rail, "Your Projects", and the
 * news/resources area. In the simulation the news column carries the lead
 * researcher's handoff, and the shared study project is the one to open.
 */
export function Welcome({ onOpen }: { onOpen: () => void }) {
  const { learnerName } = useSession()
  const docs = useProject((s) => s.docs.length)
  const memos = useProject((s) => s.memos.filter((m) => m.type === 'Field note').length)
  const [selected, setSelected] = useState(true)
  const [showMessage, setShowMessage] = useState(true)

  return (
    <div className="welcome" role="main" aria-label={`${PRODUCT_NAME} Welcome Screen`}>
      <nav className="wl-rail" aria-label="Welcome options">
        <div className="wl-logo">
          <AppGlyph size={40} />
        </div>
        <div className="wl-avatar" title={learnerName} aria-label={`Signed in as ${learnerName}`}>
          {initials(learnerName)}
        </div>
        <div className="wl-rail-bottom">
          <button className="wl-rail-btn" title="Create New Project" disabled aria-label="Create new project">
            <FolderPlusIcon size={24} />
          </button>
          <button className="wl-rail-btn" title="Import Project" disabled aria-label="Import project">
            <DownloadIcon size={24} />
          </button>
          <button className="wl-rail-btn small" title="Options" disabled aria-label="Options">
            <GearIcon size={20} />
          </button>
        </div>
      </nav>

      <section className="wl-projects" aria-label="Your Projects">
        <div className="wl-projects-head">
          <h2>Your Projects</h2>
          <button className="wl-round" title="Show project list" aria-label="Show project list" disabled>
            <CaretDownIcon size={16} weight="bold" style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
        <div className="wl-search">
          <input placeholder="Search" aria-label="Search projects" />
          <SearchGlyph />
        </div>
        <div className="wl-sort">
          Last used <ChevronDown size={9} />
        </div>
        <ul className="wl-list">
          <li>
            <button
              className={'wl-project' + (selected ? ' selected' : '')}
              onClick={() => setSelected(true)}
              onDoubleClick={onOpen}
              aria-describedby="wl-proj-meta"
            >
              <span className="wl-cloud" aria-hidden="true">
                <CloudIcon size={20} color="#3f658c" />
              </span>
              <span className="wl-proj-text">
                <span className="wl-proj-name">
                  {HANDOFF.study}
                  <span className="wl-new">New</span>
                </span>
                <span id="wl-proj-meta" className="wl-proj-meta">
                  {docs} Documents, {memos} Memos, 0 Quotations
                </span>
                <span className="wl-proj-meta">Shared by {HANDOFF.from} · today</span>
              </span>
              <span className="wl-dots" aria-hidden="true">
                <DotsIcon size={18} weight="bold" />
              </span>
            </button>
          </li>
        </ul>
        <div className="wl-open-row">
          <button className="wl-open" onClick={onOpen}>
            Open Project
          </button>
        </div>
        <div className="wl-storage">0 MB used of 100 MB</div>
      </section>

      <section className="wl-news" aria-label="Messages">
        <div className="wl-winctl" aria-hidden="true">
          <span>
            <MinusIcon size={14} />
          </span>
          <span>
            <SquareIcon size={12} />
          </span>
          <span>
            <CloseIcon size={14} />
          </span>
        </div>
        <div className="wl-cols">
          <div className="wl-col-main">
            <h2>Messages</h2>
            {showMessage ? (
              <article className="wl-message" aria-label={`Message from ${HANDOFF.from}`}>
                <span className="wl-rule" aria-hidden="true" />
                <div className="wl-msg-from">
                  <span className="wl-msg-avatar" aria-hidden="true">
                    LR
                  </span>
                  <span>
                    <strong>{HANDOFF.from}</strong>
                    <span className="wl-msg-study"> · {HANDOFF.study}</span>
                  </span>
                </div>
                <h3 className="wl-msg-subject">{HANDOFF.subject}</h3>
                <p>{HANDOFF.greeting(learnerName)}</p>
                {HANDOFF.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <p className="wl-msg-lead">{HANDOFF.instructionLead}</p>
                <blockquote className="wl-instruction">{HANDOFF.instruction}</blockquote>
                <div className="wl-msg-actions">
                  <button className="wl-open" onClick={onOpen}>
                    Open Project
                  </button>
                  <span className="wl-msg-objective">
                    Objective · <strong>{HANDOFF.objective}</strong>
                  </span>
                </div>
              </article>
            ) : (
              <button className="wl-link" onClick={() => setShowMessage(true)}>
                Show message
              </button>
            )}
          </div>
          <div className="wl-col-side">
            <h2>Resources</h2>
            <div className="wl-resources">
              <div className="wl-res">
                <span className="wl-rule" aria-hidden="true" />
                <strong>Dataset</strong>
                <span>
                  {docs} interview transcripts (P1–P{docs}) · {memos} interviewer field notes
                </span>
              </div>
              <div className="wl-res">
                <span className="wl-rule" aria-hidden="true" />
                <strong>Your role</strong>
                <span>Lead Coder, {HANDOFF.study}</span>
              </div>
              <div className="wl-res">
                <span className="wl-rule" aria-hidden="true" />
                <strong>Deadline</strong>
                <span>Report to the Dean of Students in two weeks</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
