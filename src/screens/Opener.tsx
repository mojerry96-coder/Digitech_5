import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRightIcon } from '../components/icons'

/**
 * MIVA opener — ported from the "Fix the Prompt" opener package (OPENER.md,
 * reference/intro.js). Same timeline: three logos arrive one at a time while
 * the row re-centres, then dividers, chevron motif, title and Begin. ~4.5 s,
 * skippable with Esc; reduced motion shows the final frame immediately.
 */
const LOGOS = [
  { cls: 'lg-ekiti', src: '/opener/ekiti.svg', alt: 'Government of Ekiti State, Nigeria' },
  { cls: 'lg-miva', src: '/opener/miva.svg', alt: 'MIVA Open University' },
  { cls: 'lg-tof', src: '/opener/tof.svg', alt: 'Tunji Olowolafe Foundation' },
]

export function Opener({ onBegin }: { onBegin: () => void }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const logoRefs = useRef<(HTMLSpanElement | null)[]>([])
  const beginRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])
  const shownCount = useRef(1)
  const [shift, setShift] = useState(0)
  const [inSet, setInSet] = useState<boolean[]>([false, false, false])
  const [settled, setSettled] = useState<boolean[]>([false, false, false])
  const [stage, setStage] = useState({ line: false, title: false, begin: false })
  const [leaving, setLeaving] = useState(false)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Layout positions only — getBoundingClientRect would include the entry scale. */
  const centreOn = useCallback((count: number) => {
    const row = rowRef.current
    const shown = logoRefs.current.slice(0, Math.max(count, 1)).filter(Boolean) as HTMLElement[]
    if (!row || !shown.length) return
    const first = shown[0]
    const last = shown[shown.length - 1]
    const mid = (first.offsetLeft + last.offsetLeft + last.offsetWidth) / 2
    // offsetLeft is measured inside the row, so the row's own centre is half its width
    setShift(row.offsetWidth / 2 - mid)
  }, [])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const showFinal = useCallback(() => {
    clearTimers()
    setInSet([true, true, true])
    setSettled([true, true, true])
    shownCount.current = 3
    centreOn(3)
    setStage({ line: true, title: true, begin: true })
    requestAnimationFrame(() => beginRef.current?.focus({ preventScroll: true }))
  }, [centreOn])

  const finish = () => {
    if (leaving) return
    clearTimers()
    setLeaving(true)
    window.setTimeout(onBegin, reduced ? 0 : 650)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stage.begin) return
      e.preventDefault()
      showFinal()
    }
    const onResize = () => centreOn(shownCount.current)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [stage.begin, showFinal, centreOn])

  useEffect(() => {
    if (reduced) {
      showFinal()
      return
    }
    let cancelled = false
    let started = false
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    const play = () => {
      if (cancelled || started) return
      started = true
      centreOn(1)
      const ENTER = 350
      const GAP = 1000
      const HOLD = 700
      LOGOS.forEach((_, i) => {
        at(ENTER + i * GAP, () => {
          shownCount.current = i + 1
          centreOn(i + 1) // the row slides; the newcomer fades in beside it
          setInSet((s) => s.map((v, k) => v || k === i))
        })
        at(ENTER + i * GAP + HOLD, () => setSettled((s) => s.map((v, k) => v || k === i)))
      })
      const done = ENTER + (LOGOS.length - 1) * GAP + HOLD
      at(done + 500, () => setStage((s) => ({ ...s, line: true })))
      at(done + 750, () => setStage((s) => ({ ...s, title: true })))
      at(done + 1400, () => {
        setStage((s) => ({ ...s, begin: true }))
        beginRef.current?.focus({ preventScroll: true })
      })
    }
    // The logos must be laid out before the centre offsets mean anything.
    const imgs = logoRefs.current.map((el) => el?.querySelector('img')).filter(Boolean) as HTMLImageElement[]
    // rAF can stall in a background tab, so a short timer backs it up.
    Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r))))).then(() => {
      requestAnimationFrame(play)
      window.setTimeout(play, 60)
    })
    return () => {
      cancelled = true
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cls = ['intro', stage.line && 'st-line', stage.title && 'st-title', stage.begin && 'st-begin', leaving && 'out']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} role="dialog" aria-modal="true" aria-label="The Qualitative Coding Sandbox">
      <div className="intro-motif" aria-hidden="true" />
      <div className="intro-inner">
        <div className="intro-logos" ref={rowRef} style={{ ['--shift' as string]: `${shift}px` }}>
          {LOGOS.map((l, i) => (
            <span key={l.cls} style={{ display: 'contents' }}>
              {i > 0 && <span className="intro-rule" aria-hidden="true" />}
              <span
                ref={(el) => (logoRefs.current[i] = el)}
                className={['intro-logo', l.cls, inSet[i] && 'in', settled[i] && 'set'].filter(Boolean).join(' ')}
              >
                <img src={l.src} alt={l.alt} />
              </span>
            </span>
          ))}
        </div>
        <p className="intro-tagline">Study. Anywhere. Anyone. Anytime.</p>
        <h1 className="intro-title">
          The Qualitative Coding <span className="accent">Sandbox</span>
        </h1>
        <p className="intro-sub">Qualitative coding and thematic analysis</p>
        <button ref={beginRef} className="miva-cta intro-begin" type="button" onClick={finish}>
          Begin <ArrowRightIcon size={18} weight="bold" />
        </button>
      </div>
      <button className="intro-skip" type="button" onClick={showFinal}>
        Skip <kbd>Esc</kbd>
      </button>
    </div>
  )
}
