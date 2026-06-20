'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
}

export default function SearchBar({ value, onChange, placeholder = 'Search bridges...', loading }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), 300)
  }

  function handleClear() {
    setLocalValue('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onChange('')
  }

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'placeholder-gray-400 bg-white'
        )}
      />
      {localValue && !loading && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {loading && (
        <div className="absolute right-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}
