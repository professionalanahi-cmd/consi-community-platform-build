import { cn } from '@/lib/utils'

export type OrbState = 'idle' | 'listening' | 'speaking' | 'thinking'

export function Orb({ size = 96, state = 'idle', className }: { size?: number; state?: OrbState; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-state={state}
      className={cn('orb shrink-0', className)}
      style={{ width: size, height: size, fontSize: size / 6.5 }}
    >
      {state === 'listening' && <span className="orb-ring" />}
      <span className="orb-face">
        <span className="orb-eye" />
        <span className="orb-mouth" />
        <span className="orb-eye" />
      </span>
    </div>
  )
}
