'use client'

import { cn, getBridgeName, getBridgeSubtitle, formatADT, formatLength, PA_COUNTIES } from '@/lib/utils'
import type { Bridge } from '@/lib/types'
import ConditionBadge from '@/components/ui/ConditionBadge'

interface BridgeCardProps {
  bridge: Bridge
  onClick: () => void
  isSelected?: boolean
}

export default function BridgeCard({ bridge, onClick, isSelected }: BridgeCardProps) {
  const name = getBridgeName(bridge)
  const subtitle = getBridgeSubtitle(bridge)
  const county = bridge.county_code ? (PA_COUNTIES[bridge.county_code] ?? bridge.county_code) : null

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col justify-between h-48 p-4 bg-white rounded-xl border cursor-pointer',
        'hover:shadow-md hover:border-blue-300 transition-all duration-150',
        isSelected ? 'ring-2 ring-blue-500 border-blue-400' : 'border-gray-200'
      )}
    >
      <div className="flex-1 min-h-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{name}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <ConditionBadge rating={bridge.overall_cond} />
        {bridge.structural_deficiency && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            SD
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>{bridge.year_built ?? '—'}</span>
        <span>·</span>
        <span>{formatADT(bridge.adt)}</span>
        <span>·</span>
        <span>{formatLength(bridge.structure_length)}</span>
      </div>

      {county && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">{county} County</p>
      )}
    </div>
  )
}
