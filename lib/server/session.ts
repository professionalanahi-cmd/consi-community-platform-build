import 'server-only'
import { cookies } from 'next/headers'

export type Role = 'resident' | 'provider' | 'admin'

const GUEST_COOKIE = 'consi_guest'
const ROLE_COOKIE = 'consi_role'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/** Anonymous guest identifier so residents can save things without an account. */
export async function getGuestId() {
  const store = await cookies()
  const existing = store.get(GUEST_COOKIE)?.value
  if (existing) return existing
  const id = crypto.randomUUID()
  try {
    store.set(GUEST_COOKIE, id, { ...cookieOptions, maxAge: 60 * 60 * 24 * 180 })
  } catch {
    // Server Components cannot set cookies; route handlers will persist it on first write.
  }
  return id
}

export interface Session {
  role: Role
  providerId: string | null
}

/**
 * DEMO ACCESS: role is held in an httpOnly cookie set by /portal.
 * Replace with Supabase Auth + a `user_roles` table before production.
 */
export async function getSession(): Promise<Session> {
  const store = await cookies()
  const raw = store.get(ROLE_COOKIE)?.value
  if (raw === 'admin') return { role: 'admin', providerId: null }
  if (raw?.startsWith('provider:')) return { role: 'provider', providerId: raw.slice('provider:'.length) }
  return { role: 'resident', providerId: null }
}

export async function setDemoRole(role: Role, providerId?: string) {
  const store = await cookies()
  if (role === 'resident') {
    store.delete(ROLE_COOKIE)
    return
  }
  store.set(ROLE_COOKIE, role === 'admin' ? 'admin' : `provider:${providerId}`, { ...cookieOptions, maxAge: 60 * 60 * 8 })
}

export class AuthError extends Error {
  status = 403
}

export async function requireRole(role: 'provider' | 'admin') {
  const session = await getSession()
  if (session.role !== role) throw new AuthError(`This action requires the ${role} role.`)
  return session
}
