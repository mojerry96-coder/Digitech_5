import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon } from '../components/icons'
import { useSession } from '../sim/session'

/** Sequence 1 — title / landing page with student name (storyboard §6). */
export function Landing({ onContinue }: { onContinue: () => void }) {
  const { learnerName, setLearner } = useSession()
  const [name, setName] = useState(learnerName)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const ok = name.trim().length >= 2

  return (
    <div className="landing">
      <div className="landing-motif" aria-hidden="true" />
      <header className="landing-head">
        <img src="/opener/miva.svg" alt="MIVA Open University" className="landing-logo" />
      </header>
      <main className="landing-main">
        <p className="landing-eyebrow">Simulation · DT01_RD_05_03</p>
        <h1 className="landing-title">
          The Qualitative Coding <span className="accent">Sandbox</span>
        </h1>
        <p className="landing-lede">
          You are Lead Coder on a university study of why students do — or do not — use the campus wellbeing service.
        </p>
        <form
          className="landing-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!ok) return
            setLearner(name)
            onContinue()
          }}
        >
          <label htmlFor="learner-name" className="landing-label">
            Your name
          </label>
          <div className="landing-row">
            <input
              id="learner-name"
              ref={inputRef}
              className="landing-input"
              value={name}
              autoComplete="name"
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              aria-describedby="learner-name-hint"
            />
            <button className="miva-cta" type="submit" disabled={!ok}>
              Begin Simulation <ArrowRightIcon size={18} weight="bold" />
            </button>
          </div>
          <p id="learner-name-hint" className="landing-hint">
            Shown on your analysis and in your debrief.
          </p>
        </form>
      </main>
    </div>
  )
}
