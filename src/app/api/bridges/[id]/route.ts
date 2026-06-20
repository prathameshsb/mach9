import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numericId = parseInt(id)

    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bridges')
      .select('*')
      .eq('id', numericId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
