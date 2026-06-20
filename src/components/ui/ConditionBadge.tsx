'use client'

import { cn, getConditionLevel, getConditionLabel, conditionColors } from '@/lib/utils'

interface ConditionBadgeProps {
  rating: number | null
  className?: string
}

export default function ConditionBadge({ rating, className }: ConditionBadgeProps) {
  const level = getConditionLevel(rating)
  const label = getConditionLabel(rating)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        conditionColors[level],
        className
      )}
    >
      {label}
    </span>
  )
}
