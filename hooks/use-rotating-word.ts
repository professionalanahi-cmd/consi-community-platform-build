'use client'

import { useEffect, useState } from 'react'

const INTERVAL_MS = 2600
const EXIT_MS = 250

type Phase = 'shown' | 'exiting' | 'entering'

const phaseClass: Record<Phase, string> = {
  shown: 'translate-y-0 opacity-100 transition-[transform,opacity] duration-300 ease-out',
  exiting: '-translate-y-2 opacity-0 transition-[transform,opacity] duration-200 ease-in',
  entering: 'translate-y-2 opacity-0 transition-none',
}

export function useRotatingWord(words: string[]) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('shown')

  useEffect(() => {
    setIndex(0)
    setPhase('shown')
    if (words.length < 2) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let interval: number | undefined
    let swap: number | undefined
    let frame: number | undefined

    const stop = () => {
      window.clearInterval(interval)
      window.clearTimeout(swap)
      if (frame) cancelAnimationFrame(frame)
    }

    const tick = () => {
      setPhase('exiting')
      swap = window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setPhase('entering')
        // Two frames so the browser paints the below-baseline start position before sliding up.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => setPhase('shown'))
        })
      }, EXIT_MS)
    }

    const start = () => {
      stop()
      setIndex(0)
      setPhase('shown')
      if (!motionQuery.matches) interval = window.setInterval(tick, INTERVAL_MS)
    }

    start()
    motionQuery.addEventListener('change', start)
    return () => {
      stop()
      motionQuery.removeEventListener('change', start)
    }
  }, [words])

  return { word: words[index % words.length] ?? '', motionClass: phaseClass[phase] }
}
