import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PA_COUNTIES } from '@/lib/utils'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bridges')
      .select('county_code, overall_cond, structural_deficiency, year_built')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    type Agg = {
      total: number
      condSum: number
      condCount: number
      deficientCount: number
      pre1970Count: number
    }

    const countyMap = new Map<string, Agg>()

    for (const row of rows) {
      const code = row.county_code ?? ''
      if (!code) continue
      if (!countyMap.has(code)) {
        countyMap.set(code, { total: 0, condSum: 0, condCount: 0, deficientCount: 0, pre1970Count: 0 })
      }
      const entry = countyMap.get(code)!
      entry.total++
      if (row.overall_cond !== null) {
        entry.condSum += row.overall_cond
        entry.condCount++
      }
      if (row.structural_deficiency) entry.deficientCount++
      if (row.year_built !== null && row.year_built < 1970) entry.pre1970Count++
    }

    const result = Object.entries(PA_COUNTIES).map(([county_code, county_name]) => {
      const entry = countyMap.get(county_code)
      if (!entry) {
        return { county_code, county_name, total: 0, avg_condition: null, pct_deficient: 0, pct_pre_1970: 0 }
      }
      return {
        county_code,
        county_name,
        total: entry.total,
        avg_condition: entry.condCount > 0
          ? Math.round((entry.condSum / entry.condCount) * 100) / 100
          : null,
        pct_deficient: entry.total > 0
          ? Math.round((entry.deficientCount / entry.total) * 1000) / 10
          : 0,
        pct_pre_1970: entry.total > 0
          ? Math.round((entry.pre1970Count / entry.total) * 1000) / 10
          : 0,
      }
    })

    return NextResponse.json({ data: result })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
