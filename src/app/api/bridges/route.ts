import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const county = searchParams.get('county') || ''
    const condition = searchParams.get('condition') || ''
    const year_min = searchParams.get('year_min') || ''
    const year_max = searchParams.get('year_max') || ''
    const deficient = searchParams.get('deficient') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const VALID_SORT = new Set(['year_built', 'overall_cond', 'adt', 'structure_length', 'sufficiency_rating'])
    const rawSort = searchParams.get('sort') || 'year_built'
    const sort = VALID_SORT.has(rawSort) ? rawSort : 'year_built'
    const order = searchParams.get('order') === 'asc' ? true : false

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('bridges')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order(sort, { ascending: order })

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

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalCount = count ?? 0
    return NextResponse.json({
      data: data ?? [],
      count: totalCount,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
