'use client'

import { useEffect, useState } from 'react'
import type { Bridge, BridgeFilters } from '@/lib/types'
import { PA_COUNTIES, formatADT, getBridgeName } from '@/lib/utils'
import ConditionBadge from '@/components/ui/ConditionBadge'

interface WorstBridgesProps {
  filters: BridgeFilters
}

export default function WorstBridges({ filters }: WorstBridgesProps) {
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({
      sort: 'sufficiency_rating',
      order: 'asc',
      deficient: 'true',
      page: '1',
    })

    if (filters.county) params.set('county', filters.county)
    if (filters.year_min) params.set('year_min', filters.year_min)
    if (filters.year_max) params.set('year_max', filters.year_max)
    if (filters.condition) params.set('condition', filters.condition)

    setLoading(true)

    fetch(`/api/bridges?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setBridges(json.data ?? [])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [filters.county, filters.year_min, filters.year_max, filters.condition])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Worst Bridges in PA</h2>
        <p className="text-sm text-gray-500">Sorted by structural evaluation score (lowest first)</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm text-gray-900">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Bridge</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">County</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Year</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Condition</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">ADT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 w-6 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-100" /></td>
                </tr>
              ))
            ) : bridges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No bridges found
                </td>
              </tr>
            ) : (
              bridges.map((bridge, index) => {
                const countyName = bridge.county_code
                  ? (PA_COUNTIES[bridge.county_code] ?? bridge.county_code)
                  : '—'

                return (
                  <tr key={bridge.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{getBridgeName(bridge)}</td>
                    <td className="px-4 py-3 text-gray-500">{countyName}</td>
                    <td className="px-4 py-3 text-gray-500">{bridge.year_built ?? '—'}</td>
                    <td className="px-4 py-3">
                      <ConditionBadge rating={bridge.overall_cond} />
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {bridge.sufficiency_rating !== null ? bridge.sufficiency_rating : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatADT(bridge.adt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
