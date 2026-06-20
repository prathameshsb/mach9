import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const north = parseFloat(searchParams.get('north') || '0')
    const south = parseFloat(searchParams.get('south') || '0')
    const east = parseFloat(searchParams.get('east') || '0')
    const west = parseFloat(searchParams.get('west') || '0')

    const q = searchParams.get('q') || ''
    const county = searchParams.get('county') || ''
    const condition = searchParams.get('condition') || ''
    const year_min = searchParams.get('year_min') || ''
    const year_max = searchParams.get('year_max') || ''
    const deficient = searchParams.get('deficient') || ''

    let query = supabase
      .from('bridges')
      .select('id, lat, lng, structure_number, overall_cond, structural_deficiency, location, features_desc, structure_length, facility_carried')
      .gte('lat', south)
      .lte('lat', north)
      .gte('lng', west)
      .lte('lng', east)
      .limit(5000)

    if (q) {
      query = query.or(
        `location.ilike.%${q}%,facility_carried.ilike.%${q}%,features_desc.ilike.%${q}%`
      )
    }

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

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
