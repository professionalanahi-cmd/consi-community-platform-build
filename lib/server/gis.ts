import 'server-only'
import { DEFAULT_ORIGIN, DEMO_ZIP_CENTROIDS } from '../demo-data'

/**
 * GIS integration layer.
 *
 * Provides geographic context only (geocoding, boundaries, distance). It never
 * decides whether a program exists or has capacity; that comes from the
 * resource directory.
 *
 * Live mode connects server-side to the Glendale and LA County GIS MCP servers
 * using GLENDALE_GIS_MCP_URL / LA_COUNTY_GIS_MCP_URL (+ optional *_TOKEN).
 * Without them, a small demo ZIP-centroid table is used.
 */

export interface GeoPoint {
  lat: number
  lng: number
  label: string
  zip?: string
  area: 'glendale' | 'la_county' | 'other'
}

export function gisStatus() {
  return {
    glendale: Boolean(process.env.GLENDALE_GIS_MCP_URL),
    laCounty: Boolean(process.env.LA_COUNTY_GIS_MCP_URL),
    mode: process.env.GLENDALE_GIS_MCP_URL || process.env.LA_COUNTY_GIS_MCP_URL ? 'live' : 'demo',
  } as const
}

async function callMcpTool(url: string, token: string | undefined, tool: string, args: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call', params: { name: tool, arguments: args } }),
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`GIS MCP ${res.status}`)
  return res.json()
}

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function areaForPoint(lat: number, lng: number): GeoPoint['area'] {
  // Rough demo bounding boxes; live mode uses the GIS boundary layers instead.
  if (lat > 34.11 && lat < 34.27 && lng > -118.31 && lng < -118.18) return 'glendale'
  if (lat > 33.7 && lat < 34.82 && lng > -118.95 && lng < -117.65) return 'la_county'
  return 'other'
}

export async function resolveLocation(input: { zip?: string; lat?: number; lng?: number; label?: string } | null): Promise<GeoPoint> {
  if (input?.lat != null && input?.lng != null) {
    return { lat: input.lat, lng: input.lng, label: input.label ?? 'Your location', area: areaForPoint(input.lat, input.lng) }
  }
  const zip = input?.zip?.trim()
  if (zip) {
    const url = process.env.LA_COUNTY_GIS_MCP_URL
    if (url) {
      try {
        const out = await callMcpTool(url, process.env.LA_COUNTY_GIS_MCP_TOKEN, 'geocode', { query: zip })
        const hit = out?.result?.structuredContent
        if (hit?.lat && hit?.lng) return { lat: hit.lat, lng: hit.lng, label: hit.label ?? zip, zip, area: areaForPoint(hit.lat, hit.lng) }
      } catch (error) {
        console.error('[gis] live geocode failed, using demo table', error)
      }
    }
    const c = DEMO_ZIP_CENTROIDS[zip]
    if (c) return { lat: c.lat, lng: c.lng, label: `${c.city} ${zip}`, zip, area: c.area }
  }
  return { ...DEFAULT_ORIGIN, area: 'glendale' }
}
