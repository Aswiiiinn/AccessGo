import apiClient from '@/lib/axios'
import type { AccessibilityReport, PaginatedResponse, ReportCreateRequest, ReportFilters, AdminReportList, AdminReportDetail } from '@/types'

export const reportsApi = {
  getAll: async (filters?: ReportFilters & { mine?: boolean }): Promise<PaginatedResponse<AccessibilityReport>> => {
    const params: Record<string, string | number> = {}
    if (filters?.mine) params.author = 'me'
    if (filters?.status) params.status = filters.status
    if (filters?.category) params.category = filters.category
    if (filters?.severity) params.accessibility_impact = filters.severity
    if (filters?.search) params.search = filters.search
    if (filters?.page) params.page = filters.page
    if (filters?.ordering) params.ordering = filters.ordering
    const { data } = await apiClient.get<PaginatedResponse<AccessibilityReport>>('/reports/', { params })
    return data
  },

  getById: async (id: number): Promise<AccessibilityReport> => {
    const { data } = await apiClient.get<AccessibilityReport>(`/reports/${id}/`)
    return data
  },

  create: async (payload: ReportCreateRequest | FormData): Promise<AccessibilityReport> => {
    const config = payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    const { data } = await apiClient.post<AccessibilityReport>('/reports/', payload, config)
    return data
  },

  update: async (id: number, payload: Partial<ReportCreateRequest>): Promise<AccessibilityReport> => {
    const { data } = await apiClient.patch<AccessibilityReport>(`/reports/${id}/`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/reports/${id}/`)
  },

  verify: async (id: number, vote: 'confirm' | 'dispute', comment?: string): Promise<void> => {
    await apiClient.post(`/reports/${id}/verify/`, { vote, comment })
  },

  dispute: async (id: number, comment?: string): Promise<void> => {
    await apiClient.post(`/reports/${id}/dispute/`, { comment })
  },

  getVerifications: async (id: number) => {
    const { data } = await apiClient.get(`/reports/${id}/verifications/`)
    return data
  },

  withdrawVerification: async (id: number): Promise<void> => {
    await apiClient.delete(`/reports/${id}/my-verification/`)
  },

  updateVerification: async (id: number, vote: 'confirm' | 'dispute', comment?: string): Promise<void> => {
    await apiClient.patch(`/reports/${id}/my-verification/`, { vote, comment })
  },

  /** Photos are uploaded one at a time after the report exists (the create endpoint ignores files). */
  uploadImage: async (
    reportId: number,
    imageFile: File,
    onProgress?: (fraction: number) => void
  ): Promise<{ id: number; image: string; uploaded_at: string }> => {
    const formData = new FormData()
    formData.append('image', imageFile)
    const { data } = await apiClient.post(`/reports/${reportId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total)
      },
    })
    return data
  },

  deleteImage: async (reportId: number, imageId: number): Promise<void> => {
    await apiClient.delete(`/reports/${reportId}/images/${imageId}/`)
  },
}

export const adminReportsApi = {
  getAll: async (filters?: Record<string, string | number>): Promise<PaginatedResponse<AdminReportList>> => {
    const { data } = await apiClient.get<PaginatedResponse<AdminReportList>>('/dashboard/reports/', { params: filters })
    return data
  },

  getById: async (id: number): Promise<AdminReportDetail> => {
    const { data } = await apiClient.get<AdminReportDetail>(`/dashboard/reports/${id}/`)
    return data
  },

  verify: async (id: number, reviewComment?: string): Promise<AdminReportDetail> => {
    const { data } = await apiClient.post<AdminReportDetail>(`/dashboard/reports/${id}/verify/`, { review_comment: reviewComment || '' })
    return data
  },

  reject: async (id: number, reviewComment: string): Promise<AdminReportDetail> => {
    const { data } = await apiClient.post<AdminReportDetail>(`/dashboard/reports/${id}/reject/`, { review_comment: reviewComment })
    return data
  },

  resolve: async (id: number, reviewComment?: string): Promise<AdminReportDetail> => {
    const { data } = await apiClient.post<AdminReportDetail>(`/dashboard/reports/${id}/resolve/`, { review_comment: reviewComment || '' })
    return data
  },

  requestInfo: async (id: number, reviewComment?: string): Promise<AdminReportDetail> => {
    const { data } = await apiClient.post<AdminReportDetail>(`/dashboard/reports/${id}/request-info/`, { review_comment: reviewComment || '' })
    return data
  },
}
