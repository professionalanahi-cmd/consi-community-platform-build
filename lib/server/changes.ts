import 'server-only'
import type { ChangedField, Resource, ResourceChangeKind } from '../types'
import { db, newId } from './store'

const TRACKED: { field: ChangedField['field']; kind: ResourceChangeKind; get: (r: Resource) => string | null }[] = [
  { field: 'eligibility', kind: 'eligibility', get: (r) => r.eligibility.map((e) => e.label).join('; ') || null },
  { field: 'availability', kind: 'availability', get: (r) => r.availability },
  { field: 'phone', kind: 'contact', get: (r) => r.phone ?? null },
  { field: 'email', kind: 'contact', get: (r) => r.email ?? null },
  { field: 'website', kind: 'contact', get: (r) => r.website ?? null },
  { field: 'address', kind: 'contact', get: (r) => [r.location.address, r.location.city, r.location.zip].filter(Boolean).join(', ') || null },
  { field: 'schedule', kind: 'schedule', get: (r) => r.schedule ?? null },
  { field: 'startDate', kind: 'schedule', get: (r) => r.startDate?.slice(0, 10) ?? null },
  { field: 'deadline', kind: 'deadline', get: (r) => r.deadline?.slice(0, 10) ?? null },
]

function push(resourceId: string, kind: ResourceChangeKind, fields: ChangedField[], source: string) {
  db.changes.unshift({ id: newId('chg'), resourceId, kind, fields, source, at: new Date().toISOString() })
  if (db.changes.length > 500) db.changes.length = 500
}

/** Called when a listing is (re)published: diffs it against the last published version. */
export function recordPublish(r: Resource) {
  const before = db.snapshots.get(r.id)
  if (!before) {
    push(r.id, 'new_resource', [], r.source)
  } else {
    const byKind = new Map<ResourceChangeKind, ChangedField[]>()
    for (const t of TRACKED) {
      const prev = t.get(before)
      const next = t.get(r)
      if (prev !== next) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), { field: t.field, before: prev, after: next }])
    }
    for (const [kind, fields] of byKind) push(r.id, kind, fields, r.source)
  }
  db.snapshots.set(r.id, structuredClone(r))
}

/** Called when a published listing is paused, resumed or taken down. */
export function recordListingStatus(r: Resource, before: 'listed' | 'paused', after: 'listed' | 'paused' | 'removed', source: string) {
  push(r.id, 'availability', [{ field: 'status', before, after }], source)
}
