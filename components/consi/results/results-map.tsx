'use client'

import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import type { Recommendation } from '@/lib/types'

const STATUS_COLOR: Record<Recommendation['displayStatus'], string> = {
  verified: '#2f6f6a',
  potential_match: '#25272b',
  needs_review: '#8a6d1f',
}

export default function ResultsMap({
  results,
  origin,
  milesLabel,
}: {
  results: Recommendation[]
  origin: { lat: number; lng: number; label: string } | null
  milesLabel: (n: number) => string
}) {
  const center = origin ?? (results[0] ? { lat: results[0].resource.location.lat, lng: results[0].resource.location.lng } : { lat: 34.1425, lng: -118.255 })
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom={false} className="h-96 w-full rounded-3xl ring-1 ring-border">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {origin && <CircleMarker center={[origin.lat, origin.lng]} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#3b6fd8', fillOpacity: 1 }} />}
      {results.map((r, i) => (
        <CircleMarker
          key={r.resource.id}
          center={[r.resource.location.lat, r.resource.location.lng]}
          radius={12}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: STATUS_COLOR[r.displayStatus], fillOpacity: 1 }}
        >
          <Popup>
            <strong>{`${i + 1}. ${r.display.name}`}</strong>
            <br />
            {r.resource.location.address}
            {r.distanceMiles != null && (
              <>
                <br />
                {milesLabel(r.distanceMiles)}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
