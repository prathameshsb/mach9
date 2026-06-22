import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      .select('year_built, overall_cond')

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

    const yearMap = new Map<number, { good: number; fair: number; poor: number }>()

    for (const row of rows) {
      if (row.year_built === null || row.year_built === undefined) continue
      if (row.overall_cond === null || row.overall_cond === undefined) continue

      const year: number = row.year_built
      const cond: number = row.overall_cond

      let bucket: 'good' | 'fair' | 'poor'
      if (cond >= 7) {
        bucket = 'good'
      } else if (cond >= 5) {
        bucket = 'fair'
      } else {
        bucket = 'poor'
      }

      if (!yearMap.has(year)) {
        yearMap.set(year, { good: 0, fair: 0, poor: 0 })
      }
      yearMap.get(year)![bucket]++
    }

    const result = Array.from(yearMap.entries())
      .map(([year, counts]) => ({ year, ...counts }))
      .sort((a, b) => a.year - b.year)

    return NextResponse.json({ data: result })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
