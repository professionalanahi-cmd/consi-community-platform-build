export type SoundName = 'tap' | 'on' | 'off' | 'success' | 'search' | 'results' | 'empty' | 'error' | 'open' | 'close' | 'notify'

interface Note {
  /** Frequency in Hz. */
  f: number
  /** Glide to this frequency by the end of the note. */
  to?: number
  /** Start offset in seconds. */
  at: number
  dur: number
  gain: number
  type?: OscillatorType
}

const SOUNDS: Record<SoundName, Note[]> = {
  tap: [{ f: 660, to: 520, at: 0, dur: 0.05, gain: 0.4 }],
  on: [
    { f: 523.25, at: 0, dur: 0.08, gain: 0.4 },
    { f: 783.99, at: 0.06, dur: 0.12, gain: 0.4 },
  ],
  off: [
    { f: 783.99, at: 0, dur: 0.08, gain: 0.35 },
    { f: 523.25, at: 0.06, dur: 0.12, gain: 0.35 },
  ],
  success: [
    { f: 523.25, at: 0, dur: 0.1, gain: 0.35 },
    { f: 659.25, at: 0.07, dur: 0.1, gain: 0.35 },
    { f: 783.99, at: 0.14, dur: 0.1, gain: 0.35 },
    { f: 1046.5, at: 0.21, dur: 0.28, gain: 0.35 },
  ],
  search: [{ f: 392, to: 783.99, at: 0, dur: 0.24, gain: 0.3 }],
  results: [
    { f: 783.99, at: 0, dur: 0.16, gain: 0.35 },
    { f: 1046.5, at: 0.1, dur: 0.32, gain: 0.35 },
  ],
  empty: [
    { f: 440, at: 0, dur: 0.14, gain: 0.3 },
    { f: 349.23, at: 0.11, dur: 0.26, gain: 0.3 },
  ],
  error: [
    { f: 311.13, at: 0, dur: 0.14, gain: 0.35, type: 'triangle' },
    { f: 233.08, at: 0.12, dur: 0.28, gain: 0.35, type: 'triangle' },
  ],
  open: [
    { f: 392, at: 0, dur: 0.12, gain: 0.3 },
    { f: 523.25, at: 0.08, dur: 0.12, gain: 0.3 },
    { f: 659.25, at: 0.16, dur: 0.3, gain: 0.3 },
  ],
  close: [
    { f: 659.25, at: 0, dur: 0.12, gain: 0.28 },
    { f: 523.25, at: 0.08, dur: 0.12, gain: 0.28 },
    { f: 392, at: 0.16, dur: 0.26, gain: 0.28 },
  ],
  notify: [
    { f: 880, at: 0, dur: 0.5, gain: 0.3 },
    { f: 1760, at: 0, dur: 0.3, gain: 0.08 },
    { f: 1318.51, at: 0.12, dur: 0.55, gain: 0.25 },
  ],
}

const INTERACTIVE = 'button, a[href], select, summary, input[type="checkbox"], input[type="radio"], [role="button"], [role="switch"], [role="radio"], [role="tab"]'

/** One sound per gesture: anything requested this soon after another sound is dropped. */
const MIN_GAP_MS = 80

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true
let lastPlayedAt = Number.NEGATIVE_INFINITY

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.3
    master.connect(ctx.destination)
  }
  return ctx
}

export function setSoundEnabled(on: boolean) {
  enabled = on
}

/** Browsers only start audio from a user gesture, so call this from inside the event handler. */
export function unlockSound() {
  if (!enabled) return
  const c = audio()
  if (c && c.state !== 'running') void c.resume().catch(() => {})
}

export function playSound(name: SoundName) {
  if (!enabled) return
  const c = audio()
  if (!c || !master) return
  if (c.state !== 'running') {
    // Without a gesture the context stays suspended and the sound would play late, on the next tap.
    const active = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive
    if (!active) return
    void c.resume().catch(() => {})
  }
  const now = performance.now()
  if (now - lastPlayedAt < MIN_GAP_MS) return
  lastPlayedAt = now

  const t0 = c.currentTime + 0.01
  for (const n of SOUNDS[name]) {
    const osc = c.createOscillator()
    const env = c.createGain()
    const start = t0 + n.at
    const end = start + n.dur
    osc.type = n.type ?? 'sine'
    osc.frequency.setValueAtTime(n.f, start)
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, end)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.linearRampToValueAtTime(n.gain, start + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(env).connect(master)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

/**
 * Picks the sound for a click anywhere in the app. Controls can override it with `data-sound="<name>"`,
 * or opt out with `data-sound="none"` (set on themselves or on a container).
 */
export function soundForClick(target: EventTarget | null): SoundName | null {
  if (!(target instanceof Element)) return null
  const el = target.closest(INTERACTIVE)
  if (!el || el.matches(':disabled, [aria-disabled="true"]')) return null
  const marked = el.closest<HTMLElement>('[data-sound]')?.dataset.sound
  if (marked) return marked === 'none' ? null : marked in SOUNDS ? (marked as SoundName) : 'tap'
  if (el instanceof HTMLInputElement) return el.type === 'checkbox' ? (el.checked ? 'on' : 'off') : 'tap'
  if (el.getAttribute('role') === 'switch') return el.getAttribute('aria-checked') === 'true' ? 'off' : 'on'
  return 'tap'
}
