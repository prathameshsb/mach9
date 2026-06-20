'use client'

import type { Bridge } from '@/lib/types'
import BridgeCard from './BridgeCard'

interface BridgeGridProps {
  bridges: Bridge[]
  loading: boolean
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSelectBridge: (id: number) => void
  onClearFilters: () => void
  selectedId?: number | null
}

function SkeletonCard() {
  return (
    <div className="h-48 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-auto" />
      <div className="h-5 bg-gray-200 rounded-full w-16 mt-8" />
      <div className="flex gap-3 mt-3">
        <div className="h-3 bg-gray-100 rounded w-10" />
        <div className="h-3 bg-gray-100 rounded w-14" />
        <div className="h-3 bg-gray-100 rounded w-12" />
      </div>
    </div>
  )
}

export default function BridgeGrid({
  bridges,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onSelectBridge,
  onClearFilters,
  selectedId,
}: BridgeGridProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!loading && bridges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500 text-lg font-medium">No bridges match your filters</p>
        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        <button
          onClick={onClearFilters}
          className="mt-4 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {bridges.map(bridge => (
          <BridgeCard
            key={bridge.id}
            bridge={bridge}
            onClick={() => onSelectBridge(bridge.id)}
            isSelected={bridge.id === selectedId}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {from}–{to} of {totalCount.toLocaleString()} bridges
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
