import { useEffect, useState } from 'react'
import type { ImpactLevel } from '@/types'

export interface SelectedPlace {
  name: string
  /** Nominatim place type, mapped to a backend location_type on submit. */
  type: string
  address: string
  lat: number
  lng: number
}

export interface ReportDraft {
  title: string
  description: string
  category: string
  severity: ImpactLevel | ''
  place: SelectedPlace | null
}

export const EMPTY_DRAFT: ReportDraft = { title: '', description: '', category: '', severity: '', place: null }

const STORAGE_KEY = 'accessgo:report-draft'

function readDraft(): ReportDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DRAFT
    const parsed = JSON.parse(raw)
    return { ...EMPTY_DRAFT, ...parsed }
  } catch {
    return EMPTY_DRAFT
  }
}

export function clearStoredDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

/**
 * Report text fields survive an accidental refresh within the tab (sessionStorage).
 * Photos cannot be stored and must be re-added.
 */
export function useReportDraft() {
  const [draft, setDraft] = useState<ReportDraft>(readDraft)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* storage unavailable or full */
    }
  }, [draft])

  const update = (patch: Partial<ReportDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const reset = () => {
    clearStoredDraft()
    setDraft(EMPTY_DRAFT)
  }
  const hasContent = !!(draft.title || draft.description || draft.category || draft.severity || draft.place)

  return { draft, update, reset, hasContent }
}

/** Map Nominatim place types onto the backend's AccessibilityLocation.location_type choices. */
export function mapPlaceType(t: string): string {
  const map: Record<string, string> = {
    station: 'station',
    railway: 'station',
    train_station: 'station',
    subway_entrance: 'station',
    halt: 'station',
    bus_stop: 'bus_stop',
    bus_station: 'bus_stop',
    platform: 'bus_stop',
    entrance: 'entrance',
    path: 'pathway',
    footway: 'pathway',
    pedestrian: 'pathway',
    cycleway: 'pathway',
    steps: 'pathway',
  }
  return map[t] || 'other'
}
