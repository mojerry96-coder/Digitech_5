import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon, SkipIcon, SoundIcon } from '../components/icons'

/**
 * Walkthrough player — plays the recorded, narrated demo of the real build
 * (public/walkthrough/qcs-walkthrough-1080p.*). Same behaviour as the Drive
 * practice player: opened by the opener's Begin it plays with sound (Begin is
 * the click browsers need); if sound is blocked it plays muted and offers
 * "Turn on sound". Captions are available but off by default. At the end card
 * the drawn "Begin" becomes a real button. Skip or Esc closes it at any time.
 */
const BASE = '/walkthrough/qcs-walkthrough-1080p'
const END_CARD = 3.2 // seconds of end card at the close of the video

declare global {
  interface Window {
    WALKTHROUGH_CUES?: { s: number; e: number; t: string }[]
  }
}

export function Walkthrough({ auto, onClose, goLabel = 'Begin' }: { auto: boolean; onClose: () => void; goLabel?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const goRef = useRef<HTMLButtonElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState(false)
  const [go, setGo] = useState(false)
  const [muted, setMuted] = useState(false)
  const [missing, setMissing] = useState(false)
  const [cuesReady, setCuesReady] = useState(!!window.WALKTHROUGH_CUES)

  useEffect(() => {
    requestAnimationFrame(() => setShown(true))
    // captions come from a script (not a <track>), so they also work from a static copy
    if (!window.WALKTHROUGH_CUES) {
      const s = document.createElement('script')
      s.src = '/walkthrough/captions.js'
      s.onload = () => setCuesReady(true)
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    const cues = window.WALKTHROUGH_CUES || []
    if (!v || !cuesReady || !cues.length || !('VTTCue' in window) || v.textTracks.length) return
    const tt = v.addTextTrack('captions', 'English', 'en')
    cues.forEach((c) => tt.addCue(new VTTCue(c.s, c.e, c.t)))
    tt.mode = 'hidden'
  }, [cuesReady])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (auto) {
      v.play().catch(() => {
        // sound blocked: play muted and offer sound
        v.muted = true
        setMuted(true)
        v.play().catch(() => {})
      })
      skipRef.current?.focus({ preventScroll: true })
    } else v.focus({ preventScroll: true })
  }, [auto])

  const close = () => {
    videoRef.current?.pause()
    setShown(false)
    window.setTimeout(onClose, 300)
  }

  return (
    <div
      ref={rootRef}
      className={'wt' + (shown ? ' in' : '')}
      role="dialog"
      aria-modal="true"
      aria-label="How the Qualitative Coding Sandbox works"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          close()
        }
        if (e.key === 'Tab') {
          const f = Array.from(rootRef.current!.querySelectorAll<HTMLElement>('button, video'))
          const i = f.indexOf(document.activeElement as HTMLElement)
          if (e.shiftKey && i <= 0) {
            e.preventDefault()
            f[f.length - 1].focus()
          } else if (!e.shiftKey && i === f.length - 1) {
            e.preventDefault()
            f[0].focus()
          }
        }
      }}
    >
      <div className="wt-card">
        <div className="wt-top">
          <img src="/opener/miva.svg" alt="MIVA Open University" />
          <span className="wt-title">How the Qualitative Coding Sandbox works</span>
          <button ref={skipRef} type="button" className="wt-btn" onClick={close}>
            Skip walkthrough <SkipIcon size={16} />
          </button>
        </div>
        <div className="wt-frame">
          {missing ? (
            <div className="wt-missing">
              <div>
                <p>The walkthrough video isn’t available in this copy. You can go straight to the simulation.</p>
                <button type="button" className="miva-cta" onClick={close} autoFocus>
                  {goLabel} <ArrowRightIcon size={16} weight="bold" />
                </button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              playsInline
              preload="auto"
              aria-label="Walkthrough video with narration and captions"
              onTimeUpdate={(e) => {
                const v = e.currentTarget
                if (v.duration && v.currentTime >= v.duration - END_CARD + 0.3) setGo(true)
              }}
              onSeeking={(e) => {
                const v = e.currentTarget
                if (v.duration && v.currentTime < v.duration - END_CARD) setGo(false)
              }}
              onEnded={() => {
                setGo(true)
                requestAnimationFrame(() => goRef.current?.focus({ preventScroll: true }))
              }}
              onError={() => setMissing(true)}
            >
              <source src={`${BASE}.mp4`} type="video/mp4" />
              <source src={`${BASE}.webm`} type="video/webm" onError={() => setMissing(true)} />
            </video>
          )}
          {go && !missing && (
            <button ref={goRef} type="button" className="miva-cta wt-go" onClick={close}>
              {goLabel} <ArrowRightIcon size={18} weight="bold" />
            </button>
          )}
          {muted && !missing && (
            <button
              type="button"
              className="wt-btn wt-unmute"
              onClick={() => {
                const v = videoRef.current!
                v.muted = false
                setMuted(false)
                v.play().catch(() => {})
              }}
            >
              <SoundIcon size={16} /> Turn on sound
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
