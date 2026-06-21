import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PA_COUNTIES } from '@/lib/utils'

function classify(overall_cond: number | null): 'good' | 'fair' | 'poor' | 'unknown' {
  if (overall_cond === null || overall_cond === undefined) return 'unknown'
  if (overall_cond >= 7) return 'good'
  if (overall_cond >= 5) return 'fair'
  return 'poor'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county') || ''
    const condition = searchParams.get('condition') || ''
    const year_min = searchParams.get('year_min') || ''
    const year_max = searchParams.get('year_max') || ''
    const deficient = searchParams.get('deficient') || ''

    let query = supabase
      .from('bridges')
      .select('id, overall_cond, county_code')

    if (county) {
      query = query.eq('county_code', county)
    }

    if (condition === 'good') {
      query = query.gte('overall_cond', 7)
    } else if (condition === 'fair') {
      query = query.gte('overall_cond', 5).lte('overall_cond', 6)
    } else if (condition === 'poor') {
      query = query.lte('overall_cond', 4)
    }

    const parsedYearMin = parseInt(year_min)
    const parsedYearMax = parseInt(year_max)
    if (year_min && Number.isFinite(parsedYearMin)) {
      query = query.gte('year_built', parsedYearMin)
    }
    if (year_max && Number.isFinite(parsedYearMax)) {
      query = query.lte('year_built', parsedYearMax)
    }

    if (deficient === 'true') {
      query = query.eq('structural_deficiency', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    const conditionBreakdown = { good: 0, fair: 0, poor: 0, unknown: 0, total: rows.length }
    const countyMap = new Map<string, { good: number; fair: number; poor: number; unknown: number; total: number }>()

    for (const row of rows) {
      const bucket = classify(row.overall_cond)
      conditionBreakdown[bucket]++

      const code = row.county_code ?? ''
      if (!countyMap.has(code)) {
        countyMap.set(code, { good: 0, fair: 0, poor: 0, unknown: 0, total: 0 })
      }
      const entry = countyMap.get(code)!
      entry[bucket]++
      entry.total++
    }

    const counties = Array.from(countyMap.entries())
      .map(([county_code, counts]) => ({
        county_code,
        county_name: PA_COUNTIES[county_code] ?? county_code,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)

    return NextResponse.json({ condition: conditionBreakdown, counties })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
