export interface Bridge {
  id: number
  structure_number: string
  state_code: string | null
  county_code: string | null
  place_code: string | null
  features_desc: string | null
  facility_carried: string | null
  location: string | null
  lat: number
  lng: number
  year_built: number | null
  year_reconstructed: number | null
  adt: number | null
  deck_cond: number | null
  superstructure_cond: number | null
  substructure_cond: number | null
  channel_cond: number | null
  culvert_cond: number | null
  overall_cond: number | null
  sufficiency_rating: number | null
  structural_deficiency: boolean
  bridge_posting: string | null
  structure_length: number | null
  num_spans: number | null
  num_lanes: number | null
  material_type: number | null
  design_type: number | null
}

export type BridgeMapPoint = Pick<Bridge, 'id' | 'lat' | 'lng' | 'structure_number' | 'overall_cond' | 'structural_deficiency' | 'location' | 'features_desc' | 'structure_length' | 'facility_carried'>

export type ConditionLevel = 'good' | 'fair' | 'poor' | 'unknown'

export interface BridgeFilters {
  q?: string
  county?: string
  condition?: ConditionLevel | ''
  year_min?: string
  year_max?: string
  deficient?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: string
}

export interface BridgesApiResponse {
  data: Bridge[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface MapApiResponse {
  data: BridgeMapPoint[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  filters?: BridgeFilters
}

export interface ConditionStats {
  good: number
  fair: number
  poor: number
  unknown: number
  total: number
}

export interface CountyStat {
  county_code: string
  county_name: string
  total: number
  good: number
  fair: number
  poor: number
  unknown: number
}

export interface StatsApiResponse {
  condition: ConditionStats
  counties: CountyStat[]
}
