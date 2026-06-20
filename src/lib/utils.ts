import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ConditionLevel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getConditionLevel(rating: number | null): ConditionLevel {
  if (rating === null || rating === undefined) return 'unknown'
  if (rating >= 7) return 'good'
  if (rating >= 5) return 'fair'
  return 'poor'
}

export function getConditionLabel(rating: number | null): string {
  const level = getConditionLevel(rating)
  if (level === 'unknown') return 'N/A'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export const conditionColors: Record<ConditionLevel, string> = {
  good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fair: 'bg-amber-100 text-amber-800 border-amber-200',
  poor: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const conditionDotColors: Record<ConditionLevel, string> = {
  good: '#10b981',
  fair: '#f59e0b',
  poor: '#ef4444',
  unknown: '#9ca3af',
}

export const PA_COUNTIES: Record<string, string> = {
  '001': 'Adams', '003': 'Allegheny', '005': 'Armstrong', '007': 'Beaver',
  '009': 'Bedford', '011': 'Berks', '013': 'Blair', '015': 'Bradford',
  '017': 'Bucks', '019': 'Butler', '021': 'Cambria', '023': 'Cameron',
  '025': 'Carbon', '027': 'Centre', '029': 'Chester', '031': 'Clarion',
  '033': 'Clearfield', '035': 'Clinton', '037': 'Columbia', '039': 'Crawford',
  '041': 'Cumberland', '043': 'Dauphin', '045': 'Delaware', '047': 'Elk',
  '049': 'Erie', '051': 'Fayette', '053': 'Forest', '055': 'Franklin',
  '057': 'Fulton', '059': 'Greene', '061': 'Huntingdon', '063': 'Indiana',
  '065': 'Jefferson', '067': 'Juniata', '069': 'Lackawanna', '071': 'Lancaster',
  '073': 'Lawrence', '075': 'Lebanon', '077': 'Lehigh', '079': 'Luzerne',
  '081': 'Lycoming', '083': 'McKean', '085': 'Mercer', '087': 'Mifflin',
  '089': 'Monroe', '091': 'Montgomery', '093': 'Montour', '095': 'Northampton',
  '097': 'Northumberland', '099': 'Perry', '101': 'Philadelphia', '103': 'Pike',
  '105': 'Potter', '107': 'Schuylkill', '109': 'Snyder', '111': 'Somerset',
  '113': 'Sullivan', '115': 'Susquehanna', '117': 'Tioga', '119': 'Union',
  '121': 'Venango', '123': 'Warren', '125': 'Washington', '127': 'Wayne',
  '129': 'Westmoreland', '131': 'Wyoming', '133': 'York',
}

export const MATERIAL_TYPES: Record<number, string> = {
  1: 'Concrete', 2: 'Concrete Continuous', 3: 'Steel', 4: 'Steel Continuous',
  5: 'Prestressed Concrete', 6: 'Prestressed Concrete Continuous',
  7: 'Wood or Timber', 8: 'Masonry', 9: 'Aluminum/Wrought/Cast Iron',
  0: 'Other',
}

export const DESIGN_TYPES: Record<number, string> = {
  1: 'Slab', 2: 'Stringer/Multi-Beam', 3: 'Girder & Floor Beam',
  4: 'Tee Beam', 5: 'Box Beam/Girders', 6: 'Frame',
  7: 'Orthotropic', 8: 'Truss - Deck', 9: 'Truss - Thru',
  10: 'Arch - Deck', 11: 'Arch - Thru', 12: 'Suspension',
  13: 'Stayed Girder', 14: 'Moveable - Lift', 15: 'Moveable - Bascule',
  16: 'Moveable - Swing', 17: 'Tunnel', 18: 'Culvert',
  19: 'Mixed Types', 20: 'Segmental Box Girder', 21: 'Channel Beam',
  22: 'Double Tee', 0: 'Other',
}

export function formatADT(adt: number | null): string {
  if (!adt) return 'N/A'
  if (adt >= 1000) return `${(adt / 1000).toFixed(1)}k/day`
  return `${adt}/day`
}

export function formatLength(meters: number | null): string {
  if (!meters) return 'N/A'
  const feet = meters * 3.28084
  return `${feet.toFixed(0)} ft`
}

export function getBridgeName(bridge: { features_desc?: string | null; facility_carried?: string | null; location?: string | null }): string {
  return bridge.facility_carried?.trim() || bridge.features_desc?.trim() || bridge.location?.trim() || 'Bridge'
}

export function getBridgeSubtitle(bridge: { features_desc?: string | null; location?: string | null; facility_carried?: string | null }): string {
  if (bridge.facility_carried && bridge.features_desc) {
    return `Over ${bridge.features_desc}`
  }
  return bridge.location?.trim() || ''
}
