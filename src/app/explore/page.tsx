'use client'

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Map, LayoutGrid, MessageCircle } from 'lucide-react'
import { useQueryState, useQueryStates, parseAsString, parseAsInteger } from 'nuqs'
import type { Bridge, BridgeFilters, ConditionLevel } from '@/lib/types'
import SearchBar from '@/components/bridges/SearchBar'
import FilterPanel from '@/components/bridges/FilterPanel'
import BridgeGrid from '@/components/bridges/BridgeGrid'
import BridgeDetail from '@/components/bridges/BridgeDetail'
import ChatPanel from '@/components/chat/ChatPanel'
import { cn } from '@/lib/utils'

const BridgeMap = dynamic(() => import('@/components/bridges/BridgeMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
})

function ExploreContent() {
  // URL-persisted navigation state
  const [view, setView] = useQueryState('view', parseAsString.withDefault('grid'))
  const [selectedId, setSelectedId] = useQueryState('id', parseAsInteger)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))

  // URL-persisted filter state (all stored as strings in URL params)
  const [rawFilters, setRawFilters] = useQueryStates({
    q:         parseAsString.withDefault(''),
    county:    parseAsString.withDefault(''),
    condition: parseAsString.withDefault(''),
    year_min:  parseAsString.withDefault(''),
    year_max:  parseAsString.withDefault(''),
    deficient: parseAsString.withDefault(''),
    sort:      parseAsString.withDefault(''),
    order:     parseAsString.withDefault(''),
  })

  // Typed BridgeFilters derived from raw URL strings (empty string → undefined)
  const filters = useMemo<BridgeFilters>(() => ({
    q:         rawFilters.q || undefined,
    county:    rawFilters.county || undefined,
    condition: (rawFilters.condition as ConditionLevel | '') || undefined,
    year_min:  rawFilters.year_min || undefined,
    year_max:  rawFilters.year_max || undefined,
    deficient: rawFilters.deficient || undefined,
    sort:      rawFilters.sort || undefined,
    order:     (rawFilters.order as 'asc' | 'desc') || undefined,
  }), [rawFilters.q, rawFilters.county, rawFilters.condition, rawFilters.year_min, rawFilters.year_max, rawFilters.deficient, rawFilters.sort, rawFilters.order])

  // Ephemeral UI state (not in URL)
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(true)

  const fetchBridges = useCallback(async (currentFilters: BridgeFilters, currentPage: number) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (currentFilters.q)         qs.set('q', currentFilters.q)
      if (currentFilters.county)    qs.set('county', currentFilters.county)
      if (currentFilters.condition) qs.set('condition', currentFilters.condition)
      if (currentFilters.year_min)  qs.set('year_min', currentFilters.year_min)
      if (currentFilters.year_max)  qs.set('year_max', currentFilters.year_max)
      if (currentFilters.deficient) qs.set('deficient', currentFilters.deficient)
      if (currentFilters.sort)      qs.set('sort', currentFilters.sort)
      if (currentFilters.order)     qs.set('order', currentFilters.order)
      qs.set('page', String(currentPage))

      const res = await fetch(`/api/bridges?${qs.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      setBridges(data.data ?? [])
      setTotalCount(data.count ?? 0)
    } catch (err) {
      console.error('Failed to fetch bridges:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBridges(filters, page ?? 1)
  }, [filters, page, fetchBridges])

  function applyFilters(updated: BridgeFilters) {
    setRawFilters({
      q:         updated.q ?? '',
      county:    updated.county ?? '',
      condition: updated.condition ?? '',
      year_min:  updated.year_min ?? '',
      year_max:  updated.year_max ?? '',
      deficient: updated.deficient ?? '',
      sort:      updated.sort ?? '',
      order:     updated.order ?? '',
    })
    setPage(null) // removes ?page= from URL, defaults back to 1
  }

  function handleFiltersChange(updated: BridgeFilters) { applyFilters(updated) }
  function handleClearFilters() { applyFilters({}) }
  function handleChatFilters(chatFilters: BridgeFilters) { applyFilters(chatFilters); setChatOpen(false) }
  function handleSelectBridge(id: number) { setSelectedId(id) }

  const activeFilterCount = [
    rawFilters.q,
    rawFilters.county,
    rawFilters.condition,
    rawFilters.year_min,
    rawFilters.year_max,
    rawFilters.deficient === 'true' ? 'true' : '',
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-tight">NBI Bridge Explorer</h1>
          <p className="text-xs text-gray-400">Pennsylvania · {totalCount.toLocaleString()} bridges</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setView('map')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'map' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
            >
              <Map className="h-3.5 w-3.5" />
              Map
            </button>
          </div>

          <button
            onClick={() => setChatOpen(prev => !prev)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              chatOpen
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Ask AI
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col gap-3 p-3">
          <SearchBar
            value={rawFilters.q}
            onChange={q => handleFiltersChange({ ...filters, q })}
            loading={loading}
          />
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
            isOpen={filterPanelOpen}
            onToggle={() => setFilterPanelOpen(v => !v)}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden relative">
          {view === 'grid' ? (
            <div className="h-full overflow-y-auto p-4">
              <BridgeGrid
                bridges={bridges}
                loading={loading}
                totalCount={totalCount}
                page={page ?? 1}
                pageSize={50}
                onPageChange={p => setPage(p)}
                onSelectBridge={handleSelectBridge}
                onClearFilters={handleClearFilters}
                selectedId={selectedId}
              />
            </div>
          ) : (
            <div className="h-full" style={{ isolation: 'isolate' }}>
              <BridgeMap
                filters={filters}
                selectedId={selectedId}
                onSelectBridge={handleSelectBridge}
              />
            </div>
          )}
        </main>
      </div>

      {/* Detail panel */}
      <BridgeDetail
        bridgeId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Chat panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onFiltersApplied={handleChatFilters}
      />
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  )
}
