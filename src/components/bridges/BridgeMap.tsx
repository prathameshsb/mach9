'use client'

import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import L from 'leaflet'
import {
  MapContainer, TileLayer, Popup, Polyline, CircleMarker, Marker,
  useMap, useMapEvents,
} from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useEffect, useRef, useState, useCallback } from 'react'
import React from 'react'
import type { BridgeFilters, BridgeMapPoint } from '@/lib/types'
import { getConditionLevel, getConditionLabel, conditionDotColors } from '@/lib/utils'

const CLUSTER_ZOOM = 12 // below this, use clusters; at/above, use span lines

const PA_BOUNDS: [[number, number], [number, number]]    = [[39.72, -80.52], [42.27, -74.69]]
const PA_MAX_BOUNDS: [[number, number], [number, number]] = [[39.4,  -80.85], [42.55, -74.3]]

// ─── Bridge span coordinates ─────────────────────────────────────────────────

function getBridgeLineCoords(bridge: BridgeMapPoint): [[number, number], [number, number]] {
  const lenM    = bridge.structure_length ?? 30
  const halfDeg = lenM / 2 / (111320 * Math.cos((bridge.lat * Math.PI) / 180))
  return [[bridge.lat, bridge.lng - halfDeg], [bridge.lat, bridge.lng + halfDeg]]
}

// ─── Popup ───────────────────────────────────────────────────────────────────

function BridgePopupContent({ bridge, onViewDetails }: { bridge: BridgeMapPoint; onViewDetails: () => void }) {
  const level = getConditionLevel(bridge.overall_cond)
  const BG: Record<string, string>   = { good: '#d1fae5', fair: '#fef3c7', poor: '#fee2e2', unknown: '#f3f4f6' }
  const FG: Record<string, string>   = { good: '#065f46', fair: '#92400e', poor: '#991b1b', unknown: '#4b5563' }
  const BD: Record<string, string>   = { good: '#a7f3d0', fair: '#fde68a', poor: '#fecaca', unknown: '#e5e7eb' }
  const name = bridge.facility_carried?.trim() || bridge.location?.trim() || bridge.features_desc?.trim() || `Bridge #${bridge.id}`
  const sub  = bridge.features_desc && bridge.facility_carried ? bridge.features_desc : bridge.location

  return (
    <div style={{ padding: '4px 2px', minWidth: 200 }}>
      <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2, lineHeight: 1.3 }}>{name}</p>
      {sub && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{sub}</p>}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: BG[level], color: FG[level], border: `1px solid ${BD[level]}` }}>
          {getConditionLabel(bridge.overall_cond)}{bridge.overall_cond !== null ? ` · ${bridge.overall_cond}/9` : ''}
        </span>
        {bridge.structural_deficiency && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>SD</span>
        )}
        {bridge.structure_length && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>{(bridge.structure_length * 3.28084).toFixed(0)} ft</span>
        )}
      </div>
      <button
        type="button"
        onClick={onViewDetails}
        style={{ width: '100%', padding: '6px 0', fontSize: 12, fontWeight: 600, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        View Full Details →
      </button>
    </div>
  )
}

// ─── Cluster marker icon factory ─────────────────────────────────────────────

function createBridgeIcon(color: string, selected: boolean) {
  const s = selected ? 14 : 10
  return L.divIcon({
    html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${color};border:${selected ? 3 : 2}px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQS(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, v) })
  return qs.toString()
}

const LEGEND = [
  { label: 'Good (7–9)', color: conditionDotColors.good },
  { label: 'Fair (5–6)', color: conditionDotColors.fair },
  { label: 'Poor (0–4)', color: conditionDotColors.poor },
  { label: 'Unknown',    color: conditionDotColors.unknown },
]

// ─── PA outline ──────────────────────────────────────────────────────────────

function PaBoundsOutline() {
  const corners: [number, number][] = [
    [39.72, -80.52], [42.27, -80.52], [42.27, -74.69], [39.72, -74.69], [39.72, -80.52],
  ]
  return (
    <Polyline
      positions={corners}
      pathOptions={{ color: '#94a3b8', weight: 1.5, opacity: 0.45, dashArray: '6 4', lineCap: 'square', interactive: false }}
    />
  )
}

// ─── "All of PA" reset button ─────────────────────────────────────────────────

function FitPaButton() {
  const map = useMap()
  return (
    <button
      type="button"
      onClick={() => map.fitBounds(PA_BOUNDS, { padding: [20, 20] })}
      className="absolute top-3 left-3 z-[1000] bg-white/95 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 shadow hover:bg-gray-50 transition-colors"
    >
      ⬜ All of PA
    </button>
  )
}

// ─── Inner map component ─────────────────────────────────────────────────────

interface MapContentProps {
  filters: BridgeFilters
  selectedId: number | null
  onSelectBridge: (id: number) => void
}

function MapContent({ filters, selectedId, onSelectBridge }: MapContentProps) {
  const map = useMap()
  const [bridges, setBridges] = useState<BridgeMapPoint[]>([])
  const [zoom, setZoom] = useState(map.getZoom())
  const [loading, setLoading] = useState(false)
  const [showNoResults, setShowNoResults] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noResultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBridges = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const b = map.getBounds()
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      try {
        const qs = buildQS({
          north: b.getNorth().toFixed(6), south: b.getSouth().toFixed(6),
          east:  b.getEast().toFixed(6),  west:  b.getWest().toFixed(6),
          q: filters.q, county: filters.county, condition: filters.condition,
          year_min: filters.year_min, year_max: filters.year_max, deficient: filters.deficient,
        })
        const res = await fetch(`/api/bridges/map?${qs}`, { signal: abortRef.current.signal })
        if (!res.ok) return
        const json  = await res.json()
        const data: BridgeMapPoint[] = json.data ?? []
        setBridges(data)
        if (data.length === 0) {
          setShowNoResults(true)
          if (noResultsTimerRef.current) clearTimeout(noResultsTimerRef.current)
          noResultsTimerRef.current = setTimeout(() => setShowNoResults(false), 3000)
        } else setShowNoResults(false)
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') console.error(err)
      } finally { setLoading(false) }
    }, 400)
  }, [map, filters])

  useMapEvents({
    moveend: fetchBridges,
    zoomend: () => { setZoom(map.getZoom()); fetchBridges() },
  })

  useEffect(() => { fetchBridges() }, [fetchBridges])
  useEffect(() => () => {
    abortRef.current?.abort()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (noResultsTimerRef.current) clearTimeout(noResultsTimerRef.current)
  }, [])

  // Line weight + dot radius scale with zoom level
  const baseWeight = zoom >= 14 ? 7 : zoom >= 12 ? 6 : zoom >= 10 ? 4 : 3
  const dotRadius  = zoom >= 14 ? 5 : zoom >= 12 ? 4 : 3

  return (
    <>
      {loading && (
        <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
          <div className="bg-white rounded-full p-1.5 shadow">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
      {bridges.length >= 1000 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-black/65 text-white text-xs px-3 py-1.5 rounded-full shadow whitespace-nowrap">
            {bridges.length.toLocaleString()} bridges shown · zoom in for full detail
          </div>
        </div>
      )}
      {showNoResults && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white border border-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full shadow">
            No bridges match in this area
          </div>
        </div>
      )}

      <PaBoundsOutline />
      <FitPaButton />

      {zoom < CLUSTER_ZOOM ? (
        // ── Clustered view (low zoom) ────────────────────────────────────────
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {bridges.map(bridge => {
            const color      = conditionDotColors[getConditionLevel(bridge.overall_cond)]
            const isSelected = bridge.id === selectedId
            return (
              <Marker
                key={bridge.id}
                position={[bridge.lat, bridge.lng]}
                icon={createBridgeIcon(color, isSelected)}
                eventHandlers={{ click: () => onSelectBridge(bridge.id) }}
              >
                <Popup minWidth={210} maxWidth={260} closeButton={false} className="bridge-popup">
                  <BridgePopupContent bridge={bridge} onViewDetails={() => onSelectBridge(bridge.id)} />
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      ) : (
        // ── Detailed span-line view (high zoom) ──────────────────────────────
        bridges.map(bridge => {
          const level      = getConditionLevel(bridge.overall_cond)
          const color      = conditionDotColors[level]
          const isSelected = bridge.id === selectedId
          const coords     = getBridgeLineCoords(bridge)

          const weight  = isSelected ? baseWeight + 4 : baseWeight
          const opacity = isSelected ? 1 : 0.85
          const radius  = isSelected ? dotRadius + 3 : dotRadius

          return (
            <React.Fragment key={bridge.id}>
              {isSelected && (
                <Polyline
                  positions={coords}
                  pathOptions={{ color: '#ffffff', weight: weight + 8, opacity: 0.5, lineCap: 'round', interactive: false }}
                />
              )}
              <Polyline
                positions={coords}
                pathOptions={{ color, weight, opacity, lineCap: 'round' }}
                eventHandlers={{
                  mouseover: (e) => { ;(e.target as L.Polyline).setStyle({ weight: weight + 4, opacity: 1 }); ;(e.target as L.Polyline).bringToFront() },
                  mouseout:  (e) => { ;(e.target as L.Polyline).setStyle({ weight, opacity }) },
                  click: () => onSelectBridge(bridge.id),
                }}
              >
                <Popup minWidth={210} maxWidth={260} closeButton={false} className="bridge-popup">
                  <BridgePopupContent bridge={bridge} onViewDetails={() => onSelectBridge(bridge.id)} />
                </Popup>
              </Polyline>
              <CircleMarker
                center={[bridge.lat, bridge.lng]}
                radius={radius}
                pathOptions={{ color: 'white', fillColor: color, fillOpacity: 1, weight: isSelected ? 3 : 2 }}
                eventHandlers={{
                  mouseover: (e) => { ;(e.target as L.CircleMarker).setRadius(radius + 3) },
                  mouseout:  (e) => { ;(e.target as L.CircleMarker).setRadius(radius) },
                  click: () => onSelectBridge(bridge.id),
                }}
              >
                <Popup minWidth={210} maxWidth={260} closeButton={false} className="bridge-popup">
                  <BridgePopupContent bridge={bridge} onViewDetails={() => onSelectBridge(bridge.id)} />
                </Popup>
              </CircleMarker>
            </React.Fragment>
          )
        })
      )}
    </>
  )
}

// ─── Root export ─────────────────────────────────────────────────────────────

interface BridgeMapProps {
  filters: BridgeFilters
  selectedId: number | null
  onSelectBridge: (id: number) => void
}

export default function BridgeMap({ filters, selectedId, onSelectBridge }: BridgeMapProps) {
  return (
    <div className="relative h-full w-full">
      <style>{`
        .bridge-popup .leaflet-popup-content-wrapper {
          border-radius: 12px; padding: 0;
          box-shadow: 0 6px 24px rgba(0,0,0,0.18);
          border: 1px solid #e5e7eb;
        }
        .bridge-popup .leaflet-popup-content { margin: 12px 14px; }
        .bridge-popup .leaflet-popup-tip-container { display: none; }
      `}</style>

      {/* Condition legend */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-white/95 rounded-xl shadow border border-gray-100 px-3 py-2.5 pointer-events-none">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Condition</p>
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
            <div style={{ width: 20, height: 4, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      <MapContainer
        bounds={PA_BOUNDS}
        maxBounds={PA_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={7}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapContent filters={filters} selectedId={selectedId} onSelectBridge={onSelectBridge} />
      </MapContainer>
    </div>
  )
}
