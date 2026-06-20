'use client'

import { cn, PA_COUNTIES } from '@/lib/utils'
import type { BridgeFilters, ConditionLevel } from '@/lib/types'

interface FilterPanelProps {
  filters: BridgeFilters
  onChange: (updated: BridgeFilters) => void
  onClear: () => void
  isOpen?: boolean
  onToggle?: () => void
}

const CONDITIONS: { label: string; value: ConditionLevel | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
  { label: 'Poor', value: 'poor' },
]

const SORTED_COUNTIES = Object.entries(PA_COUNTIES).sort((a, b) => a[1].localeCompare(b[1]))

export default function FilterPanel({ filters, onChange, onClear, isOpen = true }: FilterPanelProps) {
  if (!isOpen) return null

  function set(patch: Partial<BridgeFilters>) {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 rounded-xl">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condition</p>
        <div className="flex gap-1.5">
          {CONDITIONS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => set({ condition: value })}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                filters.condition === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
          County
        </label>
        <select
          value={filters.county ?? ''}
          onChange={e => set({ county: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Counties</option>
          {SORTED_COUNTIES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Year Built</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">From</label>
            <input
              type="number"
              placeholder="e.g. 1900"
              value={filters.year_min ?? ''}
              onChange={e => set({ year_min: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">To</label>
            <input
              type="number"
              placeholder="e.g. 2024"
              value={filters.year_max ?? ''}
              onChange={e => set({ year_max: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.deficient === 'true'}
            onChange={e => set({ deficient: e.target.checked ? 'true' : '' })}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Structurally Deficient only</span>
        </label>
      </div>

      <button
        onClick={onClear}
        className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  )
}
