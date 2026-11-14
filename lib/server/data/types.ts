import type {
  ListingStatus,
  Preferences,
  Provider,
  Reminder,
  Resource,
  ResourceChange,
  ReviewEvent,
  SearchCriteria,
  SearchHistoryEntry,
  SearchLog,
  SearchResponse,
  TrackEventType,
} from '../../types'

/**
 * Storage contracts for CONSI.
 *
 * Routes and server modules depend only on these interfaces, never on a
 * concrete store. Every method is async so a Postgres-backed provider can
 * implement them without changing any caller. Returned records are copies:
 * changing one does nothing until it is passed back to `save`.
 *
 * See docs/database.md for the matching table design.
 */

export interface ResourceFilter {
  status?: ListingStatus | ListingStatus[]
  providerId?: string
}

export interface ResourceRepository {
  get(id: string): Promise<Resource | null>
  /** Returns the requested records in the given order, skipping unknown ids. */
  getMany(ids: string[]): Promise<Resource[]>
  list(filter?: ResourceFilter): Promise<Resource[]>
  exists(id: string): Promise<boolean>
  save(resource: Resource): Promise<Resource>
  /** Moves every listing of a provider from one status to another. Returns how many changed. */
  setStatusForProvider(providerId: string, from: ListingStatus, to: ListingStatus): Promise<number>
}

export interface ProviderRepository {
  get(id: string): Promise<Provider | null>
  list(): Promise<Provider[]>
  save(provider: Provider): Promise<Provider>
}

/** Everything tied to an anonymous visitor (the guest cookie). A future account system maps a user id here. */
export interface GuestRepository {
  listSaved(guestId: string): Promise<string[]>
  addSaved(guestId: string, resourceId: string): Promise<string[]>
  removeSaved(guestId: string, resourceId: string): Promise<string[]>

  listReminders(guestId: string): Promise<Reminder[]>
  getReminder(guestId: string, id: string): Promise<Reminder | null>
  addReminder(guestId: string, reminder: Reminder): Promise<Reminder>
  removeReminder(guestId: string, id: string): Promise<void>

  getPrefs(guestId: string): Promise<Preferences | null>
  setPrefs(guestId: string, prefs: Preferences): Promise<Preferences>

  getAiUpdates(guestId: string): Promise<boolean>
  setAiUpdates(guestId: string, enabled: boolean): Promise<boolean>

  /** Removes everything stored for this guest ("Delete my data"). */
  deleteAll(guestId: string): Promise<void>
}

export interface SearchHistoryRepository {
  list(guestId: string): Promise<SearchHistoryEntry[]>
  get(guestId: string, id: string): Promise<SearchHistoryEntry | null>
  /**
   * One entry per search session: refinements, follow-up answers and "show more"
   * update the same entry, and it becomes the guest's active Results entry.
   */
  record(guestId: string, id: string, criteria: SearchCriteria, page: number, response: SearchResponse): Promise<void>
  getActive(guestId: string): Promise<SearchHistoryEntry | null>
  /** Clears the Results tab pointer only; history entries are kept. */
  clearActive(guestId: string): Promise<void>
}

export interface ResourceStats {
  impressions: number
  views: number
  referrals: number
}

/** Aggregate, non-identifying usage data for providers and admins. */
export interface ActivityRepository {
  track(resourceId: string, type: TrackEventType): Promise<void>
  statsFor(resourceIds: string[]): Promise<Record<string, ResourceStats>>
  logSearch(log: SearchLog): Promise<void>
  listSearches(): Promise<SearchLog[]>
}

/** Verification and moderation trail for listings. */
export interface ReviewRepository {
  log(resourceId: string, actor: ReviewEvent['actor'], action: string, note?: string): Promise<void>
  listForResource(resourceId: string): Promise<ReviewEvent[]>
  listRecent(limit: number): Promise<ReviewEvent[]>
}

/** Change log used by AI Updates. Snapshots hold the last published version of each listing. */
export interface ChangeRepository {
  add(change: Omit<ResourceChange, 'id' | 'at'>): Promise<void>
  listSince(iso: string): Promise<ResourceChange[]>
  getSnapshot(resourceId: string): Promise<Resource | null>
  setSnapshot(resource: Resource): Promise<void>
}

export interface DataProvider {
  /** Shown in the admin integrations panel. */
  readonly label: string
  /** True when records only live in memory and reset on restart. */
  readonly isDemo: boolean
  resources: ResourceRepository
  providers: ProviderRepository
  guests: GuestRepository
  history: SearchHistoryRepository
  activity: ActivityRepository
  reviews: ReviewRepository
  changes: ChangeRepository
}
