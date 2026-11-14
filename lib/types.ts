export const LANGUAGES = ['en', 'es', 'hy', 'zh'] as const
export type Lang = (typeof LANGUAGES)[number]

export const CATEGORIES = [
  'arts_music',
  'food',
  'utilities',
  'jobs',
  'housing',
  'health',
  'youth_childcare',
  'education',
  'legal',
  'transportation',
  'seniors',
] as const
export type Category = (typeof CATEGORIES)[number]

export type CostType = 'free' | 'subsidized' | 'paid'
export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior'

/** Lifecycle of a listing. Only `published` listings are visible to residents. */
export type ListingStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'paused'
  | 'suspended'
  | 'removed'

/** How the canonical record was verified. */
export type VerificationState = 'verified' | 'unverified' | 'needs_review'

/** What residents see on each recommendation card. */
export type DisplayStatus = 'verified' | 'potential_match' | 'needs_review'

export type EligibilityRule =
  | { id: string; kind: 'age'; min?: number; max?: number; label: string }
  | { id: string; kind: 'residency'; area: string; label: string }
  | { id: string; kind: 'income'; label: string }
  | { id: string; kind: 'other'; label: string }

export interface ResourceTranslation {
  name: string
  summary: string
  eligibilityNotes?: string
  /** Machine translation that still needs a human check. */
  needsReview?: boolean
}

export interface ResourceLocation {
  address: string
  city: string
  zip: string
  lat: number
  lng: number
}

export interface Resource {
  id: string
  providerId: string | null
  organization: string
  /** Canonical (original-language) program name and summary. */
  name: string
  summary: string
  sourceLanguage: string
  categories: Category[]
  tags: string[]
  cost: CostType
  costDetail?: string
  ageGroups: AgeGroup[]
  eligibility: EligibilityRule[]
  location: ResourceLocation
  phone?: string
  email?: string
  website?: string
  languages: Lang[]
  accessibility: string[]
  transitNearby: boolean
  registrationRequired: boolean
  availability: 'open' | 'waitlist' | 'seasonal' | 'closed'
  schedule?: string
  deadline?: string
  startDate?: string
  translations: Partial<Record<Lang, ResourceTranslation>>
  status: ListingStatus
  verification: VerificationState
  lastVerified?: string
  source: string
  isSample: boolean
  reviewNotes?: string
  originalFlyer?: { name: string; mediaType: string; text?: string }
  uncertainFields?: string[]
  createdAt: string
  updatedAt: string
}

export interface Provider {
  id: string
  name: string
  contactEmail: string
  website?: string
  status: 'pending' | 'verified' | 'suspended'
  isSample: boolean
  createdAt: string
}

export interface ReviewEvent {
  id: string
  resourceId: string
  actor: 'provider' | 'admin'
  action: string
  note?: string
  at: string
}

export type TrackEventType = 'impression' | 'view' | 'referral'
export interface TrackEvent {
  resourceId: string
  type: TrackEventType
  at: string
}

/** Aggregated, non-identifying search log used for demand intelligence. */
export interface SearchLog {
  categories: Category[]
  zip: string | null
  resultCount: number
  unconfirmedRules: string[]
  at: string
}

export interface Reminder {
  id: string
  title: string
  date: string
  kind: 'deadline' | 'registration' | 'start' | 'follow_up'
  resourceId?: string
  createdAt: string
}

export interface SavedLocation {
  label: 'home' | 'work' | 'school'
  zip: string
}

export interface Preferences {
  language: Lang | null
  textSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  reducedMotion: boolean
  simplified: boolean
  captions: boolean
  voiceEnabled: boolean
  voiceSpeed: number
  autoRead: boolean
  useDeviceLocation: boolean
  defaultRadius: number
  savedLocations: SavedLocation[]
  consentSaveInfo: boolean
  consentShareWithProviders: boolean
  notify: {
    newResources: boolean
    registrationOpenings: boolean
    deadlines: boolean
    availabilityChanges: boolean
    contactChanges: boolean
  }
}

export interface SearchFilters {
  cost?: CostType | 'any'
  ageGroup?: AgeGroup | 'any'
  availability?: 'open' | 'any'
  language?: Lang | 'any'
  accessible?: boolean
  transit?: boolean
  noRegistration?: boolean
}

export interface SearchAnswers {
  ageGroup?: AgeGroup | 'skip'
  incomeQualifies?: 'yes' | 'no' | 'skip'
  residentOf?: 'glendale' | 'la_county' | 'other' | 'skip'
}

export interface SearchRequest {
  query: string
  lang: Lang
  location: { zip?: string; lat?: number; lng?: number; label?: string } | null
  radiusMiles: number
  answers: SearchAnswers
  filters: SearchFilters
  page: number
}

export interface FollowUpQuestion {
  key: keyof SearchAnswers
  question: string
  why: string
  options: { value: string; label: string }[]
}

export interface EligibilityCheck {
  label: string
  state: 'met' | 'confirm' | 'not_met'
}

export interface Recommendation {
  resource: Resource
  display: { name: string; summary: string; translated: boolean }
  distanceMiles: number | null
  displayStatus: DisplayStatus
  why: string[]
  eligibility: EligibilityCheck[]
  score: number
}

export interface SearchResponse {
  interpretation: { summary: string; categories: Category[]; usedAI: boolean }
  followUp: FollowUpQuestion | null
  results: Recommendation[]
  total: number
  page: number
  pageCount: number
  radiusMiles: number
  radiusExpanded: boolean
  origin: { lat: number; lng: number; label: string } | null
}

export type SearchCriteria = Pick<SearchRequest, 'query' | 'location' | 'radiusMiles' | 'answers' | 'filters'>

/** A completed search and the exact results it produced, kept independently of the active Results tab. */
export interface SearchHistoryEntry {
  id: string
  createdAt: string
  updatedAt: string
  criteria: SearchCriteria
  page: number
  total: number
  response: SearchResponse
}

export type SearchHistorySummary = Omit<SearchHistoryEntry, 'response'>
