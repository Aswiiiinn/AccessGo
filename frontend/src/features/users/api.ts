import apiClient from '@/lib/axios'
import type { AdminUser, AdminUserDetail, PaginatedResponse, PotentialDuplicate, UpdateUserStatusRequest } from '@/types'

export const usersApi = {
  /** GET /dashboard/users/ is paginated (PAGE_SIZE 20); supports ?search=, ?role=, ?is_active=, ?page=. */
  getAll: async (params?: Record<string, string | number | boolean>): Promise<PaginatedResponse<AdminUser>> => {
    const { data } = await apiClient.get<PaginatedResponse<AdminUser> | AdminUser[]>('/dashboard/users/', { params })
    if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data }
    return data
  },

  getById: async (id: number): Promise<AdminUserDetail> => {
    const { data } = await apiClient.get<AdminUserDetail>(`/dashboard/users/${id}/`)
    return data
  },

  updateStatus: async (id: number, status: UpdateUserStatusRequest): Promise<AdminUser> => {
    const { data } = await apiClient.patch<AdminUser>(`/dashboard/users/${id}/status/`, status)
    return data
  },

  getPotentialDuplicates: async (params?: { status?: string }): Promise<PotentialDuplicate[]> => {
    const { data } = await apiClient.get<any>('/reports/duplicate-reports/', { params: params?.status ? { status: params.status } : undefined })
    // Handle both paginated (DRF default) and plain list responses
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    return []
  },

  reviewDuplicate: async (id: number, action: 'confirm' | 'dismiss', reason?: string): Promise<PotentialDuplicate> => {
    const { data } = await apiClient.post<PotentialDuplicate>(`/reports/duplicate-reports/${id}/review/`, {
      action,
      reason,
    })
    return data
  },
}
