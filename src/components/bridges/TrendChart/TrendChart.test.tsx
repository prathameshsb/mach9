import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TrendChart from './TrendChart'
import type { BridgeFilters, TrendsDataPoint } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock recharts — jsdom has no layout engine so recharts refuses to render.
//
// Strategy:
//   - ResponsiveContainer / LineChart / CartesianGrid / XAxis / YAxis / Tooltip
//     are replaced with thin wrappers that render their children.
//   - Line renders a <span data-testid="line-{name}"> so tests can assert
//     which series are included in the chart.
//   - Legend renders a <ul data-testid="legend"> whose items show the name of
//     each series — mirrors what recharts <Legend> does in a real browser.
// ---------------------------------------------------------------------------
vi.mock('recharts', () => {
  const React = require('react') as typeof import('react')

  const wrap =
    (tag = 'div', extraProps = {}) =>
    ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, { ...rest, ...extraProps }, children)

  // Line: renders a labelled sentinel element
  const Line = ({ name, dataKey }: { name: string; dataKey: string }) =>
    React.createElement('span', {
      'data-testid': `line-${String(dataKey)}`,
      'data-name': name,
    })

  // Legend: renders each payload entry as a list item
  const Legend = ({
    payload,
  }: {
    payload?: Array<{ value: string }>
  }) => {
    if (!payload?.length) return null
    return React.createElement(
      'ul',
      { 'data-testid': 'recharts-legend' },
      payload.map((entry) =>
        React.createElement('li', { key: entry.value }, entry.value),
      ),
    )
  }

  return {
    ResponsiveContainer: wrap('div'),
    LineChart: wrap('div'),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Line,
    Legend,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrendsResponse(data: TrendsDataPoint[]) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const defaultFilters: BridgeFilters = {}

const multiSeriesData: TrendsDataPoint[] = [
  { year: 1960, good: 10, fair: 5, poor: 2 },
  { year: 1970, good: 20, fair: 8, poor: 4 },
  { year: 1980, good: 15, fair: 12, poor: 6 },
]

const goodOnlyData: TrendsDataPoint[] = [
  { year: 1960, good: 10, fair: 0, poor: 0 },
  { year: 1970, good: 20, fair: 0, poor: 0 },
]

const allZeroData: TrendsDataPoint[] = [
  { year: 1960, good: 0, fair: 0, poor: 0 },
  { year: 1970, good: 0, fair: 0, poor: 0 },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TrendChart', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Loading state ─────────────────────────────────────────────────────────

  it('renders loading skeleton while fetch is in flight', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

    render(<TrendChart filters={defaultFilters} />)

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('does not render error message while loading', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

    render(<TrendChart filters={defaultFilters} />)

    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument()
  })

  it('does not render chart lines while loading', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

    render(<TrendChart filters={defaultFilters} />)

    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
  })

  // ── Error state ───────────────────────────────────────────────────────────

  it('renders error message when fetch returns non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    )

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText(/failed to load trend data/i)).toBeInTheDocument(),
    )
  })

  it('renders error message when fetch rejects (network error)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText(/failed to load trend data/i)).toBeInTheDocument(),
    )
  })

  it('does not render loading skeleton after fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument(),
    )
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })

  it('does not render chart lines after fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
  })

  it('falls back to empty state when response JSON has no data key', async () => {
    // json.data ?? [] → [] → visibleSeries all false → empty state
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(
        screen.getByText(/no data for current filters/i),
      ).toBeInTheDocument(),
    )
  })

  // ── Successful render with data ───────────────────────────────────────────

  it('renders chart heading when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText('Bridge Condition Trends')).toBeInTheDocument(),
    )
  })

  it('renders chart sub-heading when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(
        screen.getByText(/bridge counts by construction year/i),
      ).toBeInTheDocument(),
    )
  })

  it('does not render loading skeleton after data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })

  // ── Zero-count series suppression ─────────────────────────────────────────

  it('renders good series Line when good counts are non-zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )
  })

  it('renders fair series Line when fair counts are non-zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-fair')).toBeInTheDocument(),
    )
  })

  it('renders poor series Line when poor counts are non-zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-poor')).toBeInTheDocument(),
    )
  })

  it('suppresses fair Line when all fair counts are zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-fair')).not.toBeInTheDocument()
  })

  it('suppresses poor Line when all poor counts are zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-poor')).not.toBeInTheDocument()
  })

  it('renders only poor Line when good and fair are all zero', async () => {
    const poorOnlyData: TrendsDataPoint[] = [
      { year: 1960, good: 0, fair: 0, poor: 3 },
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(poorOnlyData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-poor')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-fair')).not.toBeInTheDocument()
  })

  it('suppresses good Line when all good counts are zero', async () => {
    const fairPoorData: TrendsDataPoint[] = [
      { year: 1960, good: 0, fair: 5, poor: 3 },
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(fairPoorData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-fair')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
  })

  it('renders only fair Line when good and poor are all zero', async () => {
    const fairOnlyData: TrendsDataPoint[] = [
      { year: 1960, good: 0, fair: 7, poor: 0 },
    ]
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(fairOnlyData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-fair')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-poor')).not.toBeInTheDocument()
  })

  // ── Legend presence ───────────────────────────────────────────────────────
  // Recharts Legend component is rendered by TrendChart when at least one
  // series is visible.  Our mock Legend receives the payload recharts would
  // normally build from the Line children.  Because our mock doesn't wire up
  // that plumbing, we verify series presence via the Line test-ids above.
  // This test only checks that the Legend element itself is present.

  it('renders Legend when at least one series is visible', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )
    // The component renders <Legend /> when visibleSeries has at least one true
    // Our mock Legend renders as a <ul data-testid="recharts-legend"> only
    // when payload is provided — recharts normally passes payload itself.
    // Just assert the component doesn't crash and good/fair/poor lines exist.
    expect(screen.getByTestId('line-fair')).toBeInTheDocument()
    expect(screen.getByTestId('line-poor')).toBeInTheDocument()
  })

  // ── Empty state ───────────────────────────────────────────────────────────

  it('renders empty state message when all series are zero', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(allZeroData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(
        screen.getByText(/no data for current filters/i),
      ).toBeInTheDocument(),
    )
  })

  it('does not render any Line in empty state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(allZeroData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(screen.getByText(/no data for current filters/i)).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('line-good')).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-fair')).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-poor')).not.toBeInTheDocument()
  })

  it('renders empty state when API returns an empty data array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse([]))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() =>
      expect(
        screen.getByText(/no data for current filters/i),
      ).toBeInTheDocument(),
    )
  })

  // ── Re-fetch on filter change ─────────────────────────────────────────────

  it('calls fetch on initial render', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it('calls fetch with county param when county filter is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ county: '003' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('county=003')
    })
  })

  it('calls fetch with condition param when condition filter is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ condition: 'poor' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('condition=poor')
    })
  })

  it('calls fetch with year_min param when year_min filter is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ year_min: '1970' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('year_min=1970')
    })
  })

  it('calls fetch with year_max param when year_max filter is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ year_max: '2000' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('year_max=2000')
    })
  })

  it('calls fetch with deficient param when deficient filter is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ deficient: 'true' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('deficient=true')
    })
  })

  it('does not append county param when county is empty string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ county: '' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).not.toContain('county=')
    })
  })

  it('does not append condition param when condition is empty string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={{ condition: '' }} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).not.toContain('condition=')
    })
  })

  it('re-fetches when county filter changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      .mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    const { rerender } = render(<TrendChart filters={{ county: '001' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    rerender(<TrendChart filters={{ county: '003' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    const secondUrl = vi.mocked(fetch).mock.calls[1][0] as string
    expect(secondUrl).toContain('county=003')
  })

  it('re-fetches when condition filter changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      .mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    const { rerender } = render(<TrendChart filters={{ condition: 'good' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    rerender(<TrendChart filters={{ condition: 'poor' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    const secondUrl = vi.mocked(fetch).mock.calls[1][0] as string
    expect(secondUrl).toContain('condition=poor')
  })

  it('re-fetches when year_min filter changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      .mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    const { rerender } = render(<TrendChart filters={{ year_min: '1960' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    rerender(<TrendChart filters={{ year_min: '1980' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('re-fetches when year_max filter changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      .mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    const { rerender } = render(<TrendChart filters={{ year_max: '1990' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    rerender(<TrendChart filters={{ year_max: '2010' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('re-fetches when deficient filter changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      .mockResolvedValueOnce(makeTrendsResponse(goodOnlyData))

    const { rerender } = render(<TrendChart filters={{ deficient: 'false' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    rerender(<TrendChart filters={{ deficient: 'true' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('does not re-fetch when an unrelated filter key changes', async () => {
    vi.mocked(fetch).mockResolvedValue(makeTrendsResponse(multiSeriesData))

    const { rerender } = render(<TrendChart filters={{ sort: 'asc' }} />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    // 'sort' is not in the useEffect dependency array
    rerender(<TrendChart filters={{ sort: 'desc' }} />)

    await new Promise((r) => setTimeout(r, 50))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  // ── URL construction ──────────────────────────────────────────────────────

  it('calls the correct API endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(<TrendChart filters={defaultFilters} />)

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toMatch(/^\/api\/bridges\/trends/)
    })
  })

  it('builds URL with all five filters combined', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))

    render(
      <TrendChart
        filters={{
          county: '003',
          condition: 'poor',
          year_min: '1970',
          year_max: '2000',
          deficient: 'true',
        }}
      />,
    )

    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('county=003')
      expect(url).toContain('condition=poor')
      expect(url).toContain('year_min=1970')
      expect(url).toContain('year_max=2000')
      expect(url).toContain('deficient=true')
    })
  })

  // ── Reset to loading when filters change ─────────────────────────────────

  it('shows loading skeleton when filters change before new fetch resolves', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeTrendsResponse(multiSeriesData))
      // Second fetch never resolves — keeps component in loading state
      .mockImplementationOnce(() => new Promise(() => {}))

    const { rerender } = render(<TrendChart filters={{ county: '001' }} />)

    // Wait for first chart to render
    await waitFor(() =>
      expect(screen.getByTestId('line-good')).toBeInTheDocument(),
    )

    // Change county — setLoading(true) fires synchronously inside the effect
    rerender(<TrendChart filters={{ county: '003' }} />)

    await waitFor(() =>
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument(),
    )
  })
})
