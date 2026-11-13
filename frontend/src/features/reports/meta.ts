import {
  ArrowUpDown,
  TrendingUp,
  Footprints,
  Bath,
  Ear,
  Hand,
  Accessibility,
  Route,
  DoorOpen,
  CircleParking,
  Signpost,
  Construction,
  Layers,
  Lightbulb,
  CircleHelp,
  Hourglass,
  BadgeCheck,
  Ban,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { AccessibilityReport, ImpactLevel, ReportStatus } from '@/types'

/**
 * Presentation metadata for report fields. Values are the backend's own choices
 * (AccessibilityReport.AI_SUGGESTED_CATEGORIES, ImpactLevel, Status) — only labels,
 * descriptions and icons are added here.
 */

export interface CategoryMeta {
  value: string
  label: string
  description: string
  icon: LucideIcon
}

export const CATEGORIES: CategoryMeta[] = [
  { value: 'elevator', label: 'Elevator / lift', description: 'Broken, missing or unusable lift', icon: ArrowUpDown },
  { value: 'ramp', label: 'Ramp', description: 'Missing, steep or blocked ramp', icon: TrendingUp },
  { value: 'step_free', label: 'Step-free access', description: 'Steps with no level alternative', icon: Accessibility },
  { value: 'pathway', label: 'Footpath', description: 'Narrow, broken or blocked path', icon: Route },
  { value: 'surface', label: 'Surface', description: 'Uneven, slippery or damaged ground', icon: Layers },
  { value: 'obstacle', label: 'Obstacle', description: 'Something blocking the way', icon: Construction },
  { value: 'entrance', label: 'Entrance', description: 'Door or entrance hard to use', icon: DoorOpen },
  { value: 'tactile_paving', label: 'Tactile paving', description: 'Missing or damaged guidance paving', icon: Footprints },
  { value: 'accessible_toilet', label: 'Accessible toilet', description: 'Unavailable or unusable toilet', icon: Bath },
  { value: 'parking', label: 'Accessible parking', description: 'Blue-badge bays blocked or missing', icon: CircleParking },
  { value: 'signage', label: 'Signage', description: 'Unclear or missing signs', icon: Signpost },
  { value: 'braille_signage', label: 'Braille signage', description: 'Missing or damaged braille', icon: Hand },
  { value: 'hearing_loop', label: 'Hearing loop', description: 'Loop missing or not working', icon: Ear },
  { value: 'lighting', label: 'Lighting', description: 'Poorly lit area', icon: Lightbulb },
  { value: 'other', label: 'Something else', description: 'Any other accessibility barrier', icon: CircleHelp },
]

const CATEGORY_BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]))

export function getCategory(value: string | null | undefined): CategoryMeta {
  if (value && CATEGORY_BY_VALUE.has(value)) return CATEGORY_BY_VALUE.get(value)!
  const label = value ? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Uncategorised'
  return { value: value ?? '', label, description: '', icon: CircleHelp }
}

export interface SeverityMeta {
  value: ImpactLevel
  label: string
  description: string
  color: string
}

export const SEVERITIES: SeverityMeta[] = [
  { value: 'low', label: 'Low', description: 'Inconvenient, but there is a workable way around it', color: 'var(--ag-sev-low)' },
  { value: 'medium', label: 'Medium', description: 'Makes the route difficult for some people', color: 'var(--ag-sev-medium)' },
  { value: 'high', label: 'High', description: 'Blocks access for many disabled people', color: 'var(--ag-sev-high)' },
  { value: 'critical', label: 'Critical', description: 'Completely impassable or unsafe', color: 'var(--ag-sev-critical)' },
]

/** Raw hex values for Leaflet divIcons, which render outside the CSS-variable cascade reliably. */
export const SEVERITY_HEX: Record<string, string> = {
  low: '#2f80ed',
  medium: '#d19a00',
  high: '#e8590c',
  critical: '#c0392b',
}

export function getSeverity(value: string | null | undefined): SeverityMeta {
  return SEVERITIES.find((s) => s.value === value) ?? { value: 'low', label: value || 'Unknown', description: '', color: 'var(--ag-border-strong)' }
}

export interface StatusMeta {
  label: string
  description: string
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  icon: LucideIcon
}

export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  pending: {
    label: 'Unverified',
    description: 'Submitted by the community and awaiting moderator review.',
    tone: 'warning',
    icon: Hourglass,
  },
  verified: {
    label: 'Verified',
    description: 'Checked and approved by an AccessGo moderator.',
    tone: 'success',
    icon: BadgeCheck,
  },
  rejected: {
    label: 'Rejected',
    description: 'A moderator found this report was not accurate.',
    tone: 'danger',
    icon: Ban,
  },
  resolved: {
    label: 'Resolved',
    description: 'The barrier has been fixed.',
    tone: 'neutral',
    icon: Wrench,
  },
}

export const getStatus = (status: string): StatusMeta =>
  STATUS_META[status as ReportStatus] ?? { label: status, description: '', tone: 'neutral', icon: CircleHelp }

/** A report counts as an active barrier while it is unverified or verified. */
export const isActiveBarrier = (r: Pick<AccessibilityReport, 'status'>) => r.status === 'pending' || r.status === 'verified'

export function getReportCoords(r: Pick<AccessibilityReport, 'location_detail'>): [number, number] | null {
  const loc = r.location_detail
  if (!loc) return null
  const lat = Number(loc.latitude)
  const lng = Number(loc.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso)
}

export const truncate = (text: string | null | undefined, max: number) =>
  !text ? '' : text.length > max ? `${text.slice(0, max).trimEnd()}…` : text

/** Display title with a fallback for legacy reports saved without one. */
export const reportTitle = (r: { title?: string | null }) => r.title?.trim() || 'Untitled report'
