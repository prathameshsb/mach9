'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { CountySummary } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortKey = keyof Pick<CountySummary, 'county_name' | 'total' | 'avg_condition' | 'pct_deficient' | 'pct_pre_1970'>

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'county_name',   label: 'County',       align: 'left'  },
  { key: 'total',         label: 'Total Bridges', align: 'right' },
  { key: 'avg_condition', label: 'Avg Condition', align: 'right' },
  { key: 'pct_deficient', label: '% Deficient',  align: 'right' },
  { key: 'pct_pre_1970',  label: '% Pre-1970',   align: 'right' },
]

function conditionColor(avg: number | null): string {
  if (avg === null) return 'text-gray-400'
  if (avg >= 7) return 'text-emerald-700 font-medium'
  if (avg >= 5) return 'text-amber-700 font-medium'
  return 'text-red-700 font-medium'
}

export default function CountyComparison() {
  const [rows, setRows]       = useState<CountySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('avg_condition')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetch('/api/bridges/county-summary')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => setRows(json.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'county_name' ? 'asc' : key === 'avg_condition' ? 'asc' : 'desc')
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const cmp = (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">County Comparison</h2>
        <p className="text-sm text-gray-500">All 67 Pennsylvania counties · click any column header to sort</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm text-gray-900">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                >
                  <div className={cn('flex items-center gap-1', col.align === 'right' && 'justify-end')}>
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-100 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-100 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-100 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-100 ml-auto" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-400">
                  Failed to load county data. Please try refreshing.
                </td>
              </tr>
            ) : (
              sorted.map(row => (
                <tr key={row.county_code} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.county_name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{row.total.toLocaleString()}</td>
                  <td className={cn('px-4 py-2.5 text-right', conditionColor(row.avg_condition))}>
                    {row.avg_condition !== null ? row.avg_condition.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{row.pct_deficient.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{row.pct_pre_1970.toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
