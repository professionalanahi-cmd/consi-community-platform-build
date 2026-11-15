'use client'

import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../app-provider'

export function LocationPicker() {
  const { t, location, setLocation, prefs } = useApp()
  const [zip, setZip] = useState(location?.zip ?? '')
  const [denied, setDenied] = useState(false)
  const [locating, setLocating] = useState(false)

  const useDevice = () => {
    if (!('geolocation' in navigator)) return setDenied(true)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setDenied(false)
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: t('home.useLocation') })
      },
      () => {
        setLocating(false)
        setDenied(true)
      },
      { timeout: 8000, maximumAge: 600000 },
    )
  }

  const label = location?.lat != null ? t('home.useLocation') : location?.zip ?? 'Glendale, CA'

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card/60 p-4 ring-1 ring-border" data-guide="location">
      <p className="flex items-start gap-2 text-base text-muted-foreground">
        <MapPin className="mt-0.5 size-5 shrink-0 text-mint" aria-hidden="true" />
        <span>
          {t('home.location')} <span className="font-semibold text-foreground">{label}</span>
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^\d{5}$/.test(zip)) setLocation({ zip, label: zip })
          }}
        >
          <label htmlFor="zip" className="sr-only">
            {t('home.zipLabel')}
          </label>
          <input
            id="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              setZip(v)
              if (v.length === 5) setLocation({ zip: v, label: v })
            }}
            placeholder={t('home.zipPlaceholder')}
            className="h-12 w-full min-w-0 rounded-full bg-card px-4 text-base ring-1 ring-input outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {prefs.useDeviceLocation && (
          <button
            type="button"
            onClick={useDevice}
            disabled={locating}
            className="flex h-12 items-center gap-2 rounded-full bg-card px-4 text-base font-medium ring-1 ring-input hover:bg-muted disabled:opacity-60"
          >
            <LocateFixed className="size-5" aria-hidden="true" />
            {locating ? t('common.loading') : t('home.useLocation')}
          </button>
        )}
      </div>
      {denied && (
        <p role="status" className="text-base text-muted-foreground">
          {t('home.locationDenied')}
        </p>
      )}
    </div>
  )
}
