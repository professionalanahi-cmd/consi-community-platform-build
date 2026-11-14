import type { Preferences } from './types'

export const DEFAULT_PREFS: Preferences = {
  language: null,
  textSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  simplified: false,
  captions: true,
  voiceEnabled: true,
  voiceSpeed: 1,
  autoRead: false,
  useDeviceLocation: false,
  defaultRadius: 5,
  savedLocations: [],
  consentSaveInfo: false,
  consentShareWithProviders: false,
  notify: {
    newResources: true,
    registrationOpenings: true,
    deadlines: true,
    availabilityChanges: false,
    contactChanges: false,
  },
}

export function formatDate(iso: string, lang: string) {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'hy' ? 'hy-AM' : lang, { month: 'short', day: 'numeric', year: 'numeric' })
}
