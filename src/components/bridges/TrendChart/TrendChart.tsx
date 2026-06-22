'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BridgeFilters, TrendsDataPoint } from '@/lib/types'
import { conditionDotColors } from '@/lib/utils'

const chartColors = { ...conditionDotColors, fair: '#d97706' }

interface TrendChartProps {
  filters: BridgeFilters
}

export default function TrendChart({ filters }: TrendChartProps) {
  const [data, setData] = useState<TrendsDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams()

    if (filters.county) params.set('county', filters.county)
    if (filters.condition) params.set('condition', filters.condition)
    if (filters.year_min) params.set('year_min', filters.year_min)
    if (filters.year_max) params.set('year_max', filters.year_max)
    if (filters.deficient) params.set('deficient', filters.deficient)

    setLoading(true)
    setError(false)

    fetch(`/api/bridges/trends?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((json) => setData(json.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [filters.county, filters.condition, filters.year_min, filters.year_max, filters.deficient])

  const visibleSeries = {
    good: data.some((d) => d.good > 0),
    fair: data.some((d) => d.fair > 0),
    poor: data.some((d) => d.poor > 0),
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Bridge Condition Trends</h2>
        <p className="text-sm text-gray-500">Bridge counts by construction year and condition</p>
      </div>

      {loading ? (
        <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
      ) : error ? (
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-sm text-red-400">Failed to load trend data. Try refreshing.</p>
        </div>
      ) : !visibleSeries.good && !visibleSeries.fair && !visibleSeries.poor ? (
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-sm text-gray-400">No data for current filters.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip />
            {(visibleSeries.good || visibleSeries.fair || visibleSeries.poor) && <Legend />}
            {visibleSeries.good && (
              <Line type="monotone" dataKey="good" name="Good" stroke={chartColors.good} dot={false} strokeWidth={2} />
            )}
            {visibleSeries.fair && (
              <Line type="monotone" dataKey="fair" name="Fair" stroke={chartColors.fair} dot={false} strokeWidth={2} />
            )}
            {visibleSeries.poor && (
              <Line type="monotone" dataKey="poor" name="Poor" stroke={chartColors.poor} dot={false} strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
