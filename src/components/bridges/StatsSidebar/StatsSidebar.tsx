'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { BridgeFilters, StatsApiResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatsSidebarProps {
  filters: BridgeFilters
}

const conditionBarColors = {
  good: 'bg-emerald-500',
  fair: 'bg-amber-400',
  poor: 'bg-red-500',
  unknown: 'bg-gray-300',
}

const conditionLabels = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  unknown: 'N/A',
}

export default function StatsSidebar({ filters }: StatsSidebarProps) {
  const [stats, setStats] = useState<StatsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.county) params.set('county', filters.county)
    if (filters.condition) params.set('condition', filters.condition)
    if (filters.year_min) params.set('year_min', filters.year_min)
    if (filters.year_max) params.set('year_max', filters.year_max)
    if (filters.deficient) params.set('deficient', filters.deficient)

    setLoading(true)
    setError(false)
    fetch(`/api/bridges/stats?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setStats(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [filters.county, filters.condition, filters.year_min, filters.year_max, filters.deficient])

  const conditionKeys = ['good', 'fair', 'poor', 'unknown'] as const

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:bg-gray-100 transition-colors"
      >
        Statistics
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="p-3 flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-10 rounded bg-gray-100" />
                  <div className="flex-1 h-2 rounded bg-gray-100" />
                  <div className="h-3 w-8 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-gray-400">Stats unavailable</p>
          ) : stats ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-500">
                  {stats.condition.total.toLocaleString()} bridges
                </p>
                {conditionKeys.map((key) => {
                  const count = stats.condition[key]
                  const pct = stats.condition.total > 0
                    ? Math.round((count / stats.condition.total) * 100)
                    : 0
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-10 shrink-0">{conditionLabels[key]}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', conditionBarColors[key])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>

              {stats.counties.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-gray-500">By county</p>
                  {stats.counties.slice(0, 8).map((c) => {
                    const goodPct = c.total > 0 ? Math.round((c.good / c.total) * 100) : 0
                    const fairPct = c.total > 0 ? Math.round((c.fair / c.total) * 100) : 0
                    const poorPct = c.total > 0 ? Math.round((c.poor / c.total) * 100) : 0
                    return (
                      <div key={c.county_code} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 truncate w-20 shrink-0">{c.county_name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${goodPct}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${fairPct}%` }} />
                          <div className="bg-red-500 h-full" style={{ width: `${poorPct}%` }} />
                          <div className="bg-gray-200 h-full flex-1" />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right shrink-0">
                          {c.total.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
