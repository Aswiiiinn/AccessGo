export interface User {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  bio: string
  avatar: string | null
  created_at: string
}

export interface AccessibilityLocation {
  id: number
  name: string
  location_type: string
  address: string
  latitude: string
  longitude: string
  description: string
  is_active: boolean
  attributes: AccessibilityAttribute[]
  created_at: string
  updated_at: string
}

export interface AccessibilityAttribute {
  id: number
  attribute_type: string
  is_available: boolean
  notes: string
  updated_at: string
}

export interface AccessibilityReport {
  id: number
  author: string
  location: number
  title: string
  description: string
  category: string
  issue: string
  accessibility_impact: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'verified' | 'rejected' | 'resolved'
  ai_classification: AiClassification | null
  images: ReportImage[]
  verification_count: number
  created_at: string
  updated_at: string
}

export interface AiClassification {
  category: string
  issue: string
  description: string
  accessibility_impact: string
  confidence: number
}

export interface ReportImage {
  id: number
  image: string
  uploaded_at: string
}

export interface DashboardStats {
  total_reports: number
  pending_reports: number
  verified_reports: number
  resolved_reports: number
  total_locations: number
  total_users: number
  reports_by_impact: Record<string, number>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
