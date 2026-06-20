'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Bridge } from '@/lib/types'
import { cn, getBridgeName, formatADT, formatLength, PA_COUNTIES, MATERIAL_TYPES, DESIGN_TYPES } from '@/lib/utils'
import ConditionBadge from '@/components/ui/ConditionBadge'

interface BridgeDetailProps {
  bridgeId: number | null
  onClose: () => void
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 mr-4">{label}</span>
      <span className="text-xs text-gray-800 font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 px-4">{title}</p>
      <div className="px-4">{children}</div>
    </div>
  )
}

function SkeletonRow() {
  return <div className="h-4 bg-gray-100 rounded animate-pulse my-2" />
}

export default function BridgeDetail({ bridgeId, onClose }: BridgeDetailProps) {
  const [bridge, setBridge] = useState<Bridge | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!bridgeId) {
      setBridge(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/bridges/${bridgeId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(data => { setBridge(data); setLoading(false) })
      .catch(() => { setError('Failed to load bridge details'); setLoading(false) })
  }, [bridgeId, retryCount])

  const isOpen = bridgeId !== null

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[9998]"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[9999] flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <p className="font-semibold text-gray-900 text-sm truncate pr-4">
            {bridge ? getBridgeName(bridge) : 'Bridge Details'}
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {loading && (
            <div className="px-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-gray-500 text-sm">{error}</p>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="mt-3 text-blue-500 text-sm hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {bridge && !loading && (
            <>
              <div className="flex items-center gap-2 px-4 mb-4">
                <ConditionBadge rating={bridge.overall_cond} />
                {bridge.structural_deficiency && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                    Structurally Deficient
                  </span>
                )}
              </div>

              <Section title="Condition Ratings">
                <DetailRow label="Overall" value={bridge.overall_cond ?? 'N/A'} />
                <DetailRow label="Deck" value={bridge.deck_cond ?? 'N/A'} />
                <DetailRow label="Superstructure" value={bridge.superstructure_cond ?? 'N/A'} />
                <DetailRow label="Substructure" value={bridge.substructure_cond ?? 'N/A'} />
                <DetailRow
                  label="Channel/Culvert"
                  value={bridge.channel_cond ?? bridge.culvert_cond ?? 'N/A'}
                />
                <DetailRow
                  label="Structural Evaluation (0–9)"
                  value={bridge.sufficiency_rating ?? 'N/A'}
                />
              </Section>

              <Section title="Location">
                <DetailRow
                  label="County"
                  value={bridge.county_code ? (PA_COUNTIES[bridge.county_code] ?? bridge.county_code) : '—'}
                />
                <DetailRow label="Location" value={bridge.location} />
                <DetailRow label="Carries" value={bridge.facility_carried} />
                <DetailRow label="Crosses" value={bridge.features_desc} />
              </Section>

              <Section title="Specifications">
                <DetailRow label="Year Built" value={bridge.year_built} />
                <DetailRow label="Year Reconstructed" value={bridge.year_reconstructed} />
                <DetailRow label="Daily Traffic" value={formatADT(bridge.adt)} />
                <DetailRow label="Length" value={formatLength(bridge.structure_length)} />
                <DetailRow label="Spans" value={bridge.num_spans} />
                <DetailRow label="Lanes" value={bridge.num_lanes} />
              </Section>

              <Section title="Structure">
                <DetailRow
                  label="Material"
                  value={bridge.material_type !== null ? (MATERIAL_TYPES[bridge.material_type] ?? 'Unknown') : '—'}
                />
                <DetailRow
                  label="Design"
                  value={bridge.design_type !== null ? (DESIGN_TYPES[bridge.design_type] ?? 'Unknown') : '—'}
                />
                <DetailRow label="Structure #" value={bridge.structure_number} />
                <DetailRow label="Bridge Posting" value={bridge.bridge_posting} />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
