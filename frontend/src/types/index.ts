// User types
export interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: 'user' | 'admin'
  bio: string
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: number
  email: string
  username: string
  full_name: string
  role: 'user' | 'admin'
  is_superuser: boolean
  bio: string
  avatar: string | null
  created_at: string
  updated_at: string
}

// Token types
export interface LoginResponse {
  access: string
  refresh: string
}

export interface RefreshTokenRequest {
  refresh: string
}

export interface RefreshTokenResponse {
  access: string
  refresh: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username?: string
  full_name?: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordConfirmRequest {
  uid: string
  token: string
  new_password: string
  re_new_password: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  re_new_password: string
}

export interface ChangePasswordResponse {
  detail: string
  reauthentication_required: boolean
}

export interface ResetPasswordValidateRequest {
  uid: string
  token: string
}

export interface ChangeEmailRequest {
  new_email: string
  password: string
}

/** Writable fields of PATCH /auth/profile/ (everything else is read-only on the server). */
export interface ProfileUpdateRequest {
  username?: string
  full_name?: string
  bio?: string
  /** A File uploads a new picture (multipart); null removes the current one. */
  avatar?: File | null
}

export interface DetailResponse {
  detail: string
}

// Accessibility location types
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

export const LOCATION_TYPES = ['station', 'bus_stop', 'entrance', 'pathway', 'other'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

// Location coordinate types
export interface LocationCoordinates {
  latitude: number
  longitude: number
  location_id: number
  location_name?: string
}

export interface ReportLocationDetail {
  id: number
  name: string
  location_type: string
  address: string
  latitude: number
  longitude: number
}

// Report types
export interface AccessibilityReport {
  id: number
  author: string
  location: number
  location_detail?: ReportLocationDetail | null
  title: string
  description: string
  category: string
  issue: string
  accessibility_impact: ImpactLevel
  status: ReportStatus
  ai_classification: AiClassification | null
  classification: ReportClassification
  images: ReportImage[]
  verification_count: number
  confirm_count: number
  dispute_count: number
  created_at: string
  updated_at: string
}

export interface AdminReportList {
  id: number
  title: string
  description: string
  category: string
  severity: ImpactLevel
  status: ReportStatus
  creator: User
  location_coordinates: LocationCoordinates | null
  image_count: number
  positive_verification_count: number
  negative_verification_count: number
  creation_timestamp: string
}

export interface AdminReportDetail {
  id: number
  title: string
  description: string
  category: string
  issue: string
  severity: ImpactLevel
  status: ReportStatus
  creator: User
  location: AccessibilityLocation
  location_coordinates: LocationCoordinates | null
  uploaded_photographs: ReportImage[]
  image_count: number
  community_verification_records: AdminVerification[]
  positive_verification_count: number
  negative_verification_count: number
  administrative_review_history: AdminReview[]
  ai_classification: AiClassification | null
  classification: ReportClassification
  creation_timestamp: string
  updated_at: string
}

export interface ReportCreateRequest {
  location: number
  title: string
  description: string
  category?: string
  issue?: string
  accessibility_impact?: ImpactLevel
}

// Status and impact enums
export const REPORT_STATUSES = ['pending', 'verified', 'rejected', 'resolved'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const IMPACT_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type ImpactLevel = (typeof IMPACT_LEVELS)[number]

export const AI_CATEGORIES = [
  'elevator',
  'ramp',
  'tactile_paving',
  'accessible_toilet',
  'hearing_loop',
  'braille_signage',
  'step_free',
  'pathway',
  'entrance',
  'parking',
  'signage',
  'obstacle',
  'surface',
  'lighting',
  'other',
  'unknown',
] as const
export type AICategory = (typeof AI_CATEGORIES)[number]

export const CLASSIFICATION_STATUS = ['pending', 'completed', 'failed'] as const
export type ClassificationStatus = (typeof CLASSIFICATION_STATUS)[number]

// Image types
export interface ReportImage {
  id: number
  image: string
  uploaded_at: string
}

// Classification types
export interface ReportClassification {
  id: number
  report: number
  suggested_category: string
  suggested_severity: string
  keywords: string[]
  summary: string
  confidence_score: number | null
  ai_provider: string
  model_name: string
  classification_status: ClassificationStatus
  error_message: string
  created_at: string
  updated_at: string
}

export interface AiClassification {
  suggested_category: string
  suggested_severity: string
  keywords: string[]
  summary: string
  confidence: number | null
  provider: string
  model: string
  status: ClassificationStatus
}

// Verification types
export const VERIFICATION_VOTES = ['confirm', 'dispute'] as const
export type VerificationVote = (typeof VERIFICATION_VOTES)[number]

export interface ReportVerification {
  id: number
  verifier: string
  vote: VerificationVote
  comment: string
  created_at: string
  updated_at: string
}

export interface AdminVerification {
  id: number
  verifier: User
  vote: VerificationVote
  comment: string
  created_at: string
  updated_at: string
}

export interface CreateVerificationRequest {
  vote: VerificationVote
  comment?: string
}

// Classification review types
export interface ClassificationReview {
  id: number
  report: number
  classification: number
  reviewed_by: string
  action: 'accept' | 'reject'
  reason: string
  created_at: string
}

export interface ReviewClassificationRequest {
  action: 'accept' | 'reject'
  reason?: string
}

// Duplicate types
export const DUPLICATE_STATUS = ['suggested', 'confirmed', 'dismissed'] as const
export type DuplicateStatus = (typeof DUPLICATE_STATUS)[number]

export interface PotentialDuplicate {
  id: number
  source_report: number
  matched_report: number
  similarity_score: number | null
  detection_method: string
  status: DuplicateStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  source_report_title?: string
  matched_report_title?: string
  source_report_author?: string
  matched_report_author?: string
}

export interface ReviewDuplicateRequest {
  action: 'confirm' | 'dismiss'
  reason?: string
}

// Dashboard types
export interface DashboardStatistics {
  total_reports: number
  pending_reports: number
  verified_reports: number
  rejected_reports: number
  resolved_reports: number
  high_severity_reports: number
  total_registered_users: number
  total_accessibility_locations: number
  total_positive_verifications: number
  total_negative_verifications: number
}

export interface ReportByCategory {
  category: string | null
  count: number
}

export interface ReportByStatus {
  status: string
  count: number
}

export interface ReportsOverTimePoint {
  period: string | null
  count: number
}

export interface ReportsOverTime {
  group: string
  results: ReportsOverTimePoint[]
}

export interface AdminReview {
  id: number
  admin: User
  previous_status: ReportStatus
  new_status: ReportStatus
  action: ModerationAction
  review_comment: string
  created_at: string
}

export type ModerationAction = 'verify' | 'reject' | 'resolve' | 'request_info'

export interface ModerateReportRequest {
  review_comment?: string
}

export interface ModerateReportRejectRequest {
  review_comment: string
}

// User management types
export interface AdminUser {
  id: number
  email: string
  username: string
  full_name: string
  role: 'user' | 'admin'
  is_active: boolean
  date_joined: string
  created_at: string
}

export interface AdminUserDetail extends AdminUser {
  bio: string
  registration_date: string
  submitted_reports: AdminUserReport[]
}

export interface AdminUserReport {
  id: number
  title: string
  status: ReportStatus
  category: string
  accessibility_impact: ImpactLevel
  created_at: string
  positive_verification_count: number
  negative_verification_count: number
}

export interface UpdateUserStatusRequest {
  is_active: boolean
}

// Pagination types
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Error types
export interface ApiError {
  error: boolean
  status_code: number
  detail: Record<string, string[]> | string
}

// Map and filter types
export interface ReportFilters {
  status: string
  category: string
  severity: string
  search: string
  page: number
  ordering: string
}

export interface ReportMapOptions {
  center?: [number, number]
  zoom?: number
}
