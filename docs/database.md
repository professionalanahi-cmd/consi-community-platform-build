# CONSI data layer and future database

CONSI currently runs on **demo data only**. Every record lives in server memory
and resets when the server restarts or redeploys. Nothing described below has
been created, connected, or migrated. This document is the plan for when a
persistent PostgreSQL database (for example Neon) is introduced.

## How data flows today

```
UI components ──fetch──▶ app/api/* routes ──▶ lib/server/data (DataProvider)
                                                   │
                                                   └── demo-provider.ts ◀── lib/demo-data.ts (sample records)
```

- `lib/server/data/types.ts` defines the repository contracts. Every method is async.
- `lib/server/data/index.ts` exports `data`, picked by `CONSI_DATA_PROVIDER` (default `demo`).
- `lib/server/data/demo-provider.ts` is the in-memory implementation.
- `lib/demo-data.ts` holds all sample records (resources, providers, seeded activity),
  each marked `isSample: true`.
- Routes, `matching.ts`, `changes.ts` and `updates.ts` only use `data.*`. No UI
  component imports server data directly.

### Swapping in a database

1. Create `lib/server/data/postgres-provider.ts` that implements `DataProvider`.
2. Register it in `selectProvider()` in `lib/server/data/index.ts`.
3. Set `CONSI_DATA_PROVIDER=postgres`.

No route, component, or API response shape needs to change.

## Proposed schema (PostgreSQL)

Types are suggested. `text` ids keep today's prefixed ids (`res_…`, `prv_…`).
Timestamps are `timestamptz`.

### users (future, optional)

CONSI works without accounts. Residents are identified by an anonymous guest
cookie. A `users` table is only needed if sign-in is added later.

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| email | text unique | |
| role | text | `resident` · `provider` · `admin` |
| provider_id | text FK → providers.id | for provider staff |
| created_at | timestamptz | |

### guests

| column | type | notes |
| --- | --- | --- |
| id | text PK | value of the guest cookie |
| user_id | text FK → users.id, nullable | set if a guest later signs in |
| ai_updates | boolean | default false |
| created_at | timestamptz | |
| last_seen_at | timestamptz | used for retention clean-up |

### guest_preferences

| column | type | notes |
| --- | --- | --- |
| guest_id | text PK FK → guests.id ON DELETE CASCADE | |
| prefs | jsonb | `Preferences` object (language, accessibility, notify flags, saved locations) |
| updated_at | timestamptz | |

`language` may also be promoted to its own column if reporting needs it.

### providers

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| name | text | official name, never translated |
| contact_email | text | |
| website | text | |
| status | text | `pending` · `verified` · `suspended` |
| is_sample | boolean | |
| created_at | timestamptz | |

### resources (programs)

A resource is one program or service. `organization` is kept as plain text
because some listings come from flyers before a provider account exists.

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| provider_id | text FK → providers.id, nullable | |
| organization | text | |
| name, summary | text | canonical, original language |
| source_language | text | |
| categories | text[] | GIN index |
| tags | text[] | |
| cost | text | `free` · `subsidized` · `paid` |
| cost_detail | text | |
| age_groups | text[] | |
| eligibility | jsonb | `EligibilityRule[]` |
| phone, email, website | text | |
| languages | text[] | |
| accessibility | text[] | |
| transit_nearby, registration_required | boolean | |
| availability | text | `open` · `waitlist` · `seasonal` · `closed` |
| schedule | text | |
| deadline, start_date | date | |
| status | text | listing lifecycle, index |
| verification | text | `verified` · `unverified` · `needs_review` |
| last_verified | timestamptz | |
| source | text | |
| review_notes | text | |
| original_flyer | jsonb | name, media type, extracted text |
| uncertain_fields | text[] | |
| is_sample | boolean | |
| created_at, updated_at | timestamptz | |

### resource_locations

Split out so a program can have more than one site later.

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| resource_id | text FK → resources.id ON DELETE CASCADE | |
| address, city, zip | text | index on zip |
| lat, lng | double precision | or a PostGIS `geography(Point)` for radius search |
| is_primary | boolean | today every resource has exactly one primary location |

### resource_translations

| column | type | notes |
| --- | --- | --- |
| resource_id | text FK ON DELETE CASCADE | |
| lang | text | `en` · `es` · `hy` · `zh` |
| name, summary, eligibility_notes | text | |
| needs_review | boolean | machine translation awaiting a human check |
| PK | (resource_id, lang) | |

### verification_records (review trail)

Maps to `ReviewEvent`.

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| resource_id | text FK → resources.id | index |
| actor | text | `provider` · `admin` |
| action | text | e.g. `submitted`, `approve_publish`, `paused` |
| note | text | |
| at | timestamptz | index desc |

### resource_snapshots and resource_changes

Used by AI Updates to compare what a resident saw against the current listing.

| resource_snapshots | |
| --- | --- |
| resource_id | text PK FK |
| data | jsonb (last published `Resource`) |
| taken_at | timestamptz |

| resource_changes | |
| --- | --- |
| id | text PK |
| resource_id | text FK, index |
| kind | text (`new_resource`, `eligibility`, `availability`, `contact`, `schedule`, `deadline`) |
| fields | jsonb (`ChangedField[]`) |
| source | text |
| at | timestamptz, index |

### saved_resources

| column | type | notes |
| --- | --- | --- |
| guest_id | text FK → guests.id ON DELETE CASCADE | |
| resource_id | text FK → resources.id ON DELETE CASCADE | |
| saved_at | timestamptz | |
| PK | (guest_id, resource_id) | |

### reminders

| column | type | notes |
| --- | --- | --- |
| id | text PK | |
| guest_id | text FK ON DELETE CASCADE | |
| resource_id | text FK, nullable | |
| title | text | |
| date | date | |
| kind | text | `deadline` · `registration` · `start` · `follow_up` |
| created_at | timestamptz | |

### search_history

| column | type | notes |
| --- | --- | --- |
| id | text PK | one row per search session |
| guest_id | text FK ON DELETE CASCADE | index |
| criteria | jsonb | query, location, radius, answers, filters |
| response | jsonb | latest `SearchResponse` shown |
| page | int | |
| created_at, updated_at | timestamptz | |

`guests.active_history_id` (nullable FK) replaces today's in-memory pointer
to the entry shown on the Results tab.

### Aggregate analytics (non-identifying)

| search_logs | | resource_events | |
| --- | --- | --- | --- |
| id | bigserial PK | id | bigserial PK |
| categories | text[] | resource_id | text FK |
| zip | text | type | `impression` · `view` · `referral` |
| result_count | int | at | timestamptz |
| unconfirmed_rules | text[] | | |
| at | timestamptz | | |

These tables never store a guest id. `statsFor` becomes a `GROUP BY resource_id, type`.

## Relationships

```
providers 1──* resources 1──* resource_locations
                   │ 1──* resource_translations
                   │ 1──* verification_records
                   │ 1──1 resource_snapshots
                   │ 1──* resource_changes
                   │ 1──* resource_events
guests 1──1 guest_preferences
guests 1──* saved_resources *──1 resources
guests 1──* reminders
guests 1──* search_history
users 0..1──* guests
```

## Migration requirements

1. **Create tables** in the order above (providers → resources → children → guests → guest data).
2. **Seed sample data optionally.** Copy `lib/demo-data.ts` with `is_sample = true` so it
   can be removed later with `DELETE … WHERE is_sample`.
3. **Implement `postgres-provider.ts`** using parameterized queries only.
   - `resources.save` upserts the resource, its primary location, and its translations in one transaction.
   - `setStatusForProvider` is a single `UPDATE … WHERE provider_id = $1 AND status = $2`.
   - `guests.deleteAll` deletes the guest row; cascades remove saved items, reminders, prefs and history.
   - `history.record` upserts by id and sets `guests.active_history_id`.
4. **Retention.** Add a scheduled job that removes guests (and their data) not seen for a set period.
5. **Indexes.** `resources(status)`, GIN on `resources(categories)`, `resource_locations(zip)`,
   a spatial index if PostGIS is used, `resource_changes(at)`, `search_history(guest_id, updated_at)`.
6. **Switch over** by setting `CONSI_DATA_PROVIDER=postgres`, then update the admin
   integrations panel (it reads `data.label` and `data.isDemo`).

No in-memory demo data carries over automatically. Guest data stored today is
lost on restart and does not need to be migrated.
