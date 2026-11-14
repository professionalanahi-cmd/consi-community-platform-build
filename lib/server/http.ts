import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from './session'

export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response | unknown>) {
  return async (...args: T) => {
    try {
      const out = await fn(...args)
      return out instanceof Response ? out : NextResponse.json(out)
    } catch (error) {
      if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: 403 })
      if (error instanceof ZodError) return NextResponse.json({ error: 'Invalid request', issues: error.issues }, { status: 400 })
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
      console.error('[api] unexpected error', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
