import apiClient from '@/lib/axios'
import type { AccessibilityReport, PaginatedResponse } from '@/types'

export const getReports = async (params?: Record<string, string>): Promise<PaginatedResponse<AccessibilityReport>> => {
  const { data } = await apiClient.get('/reports/', { params })
  return data
}

export const getReport = async (id: number): Promise<AccessibilityReport> => {
  const { data } = await apiClient.get(`/reports/${id}/`)
  return data
}

export const createReport = async (payload: FormData): Promise<AccessibilityReport> => {
  const { data } = await apiClient.post('/reports/', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const updateReport = async (id: number, payload: Partial<AccessibilityReport>): Promise<AccessibilityReport> => {
  const { data } = await apiClient.patch(`/reports/${id}/`, payload)
  return data
}

export const deleteReport = async (id: number): Promise<void> => {
  await apiClient.delete(`/reports/${id}/`)
}

export const verifyReport = async (id: number, vote: 'confirm' | 'dispute', comment = ''): Promise<void> => {
  await apiClient.post(`/reports/${id}/verify/`, { vote, comment })
}
