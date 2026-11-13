import apiClient from '@/lib/axios'
import type { PotentialDuplicate, ReportVerification } from '@/types'

export const verificationApi = {
  getVerifications: async (reportId: number): Promise<ReportVerification[]> => {
    const { data } = await apiClient.get<ReportVerification[]>(`/reports/${reportId}/verifications/`)
    return data
  },

  verify: async (reportId: number, vote: 'confirm' | 'dispute', comment?: string): Promise<void> => {
    await apiClient.post(`/reports/${reportId}/verify/`, { vote, comment })
  },

  dispute: async (reportId: number, comment?: string): Promise<void> => {
    await apiClient.post(`/reports/${reportId}/dispute/`, { comment })
  },

  withdraw: async (reportId: number): Promise<void> => {
    await apiClient.delete(`/reports/${reportId}/my-verification/`)
  },

  update: async (reportId: number, vote: 'confirm' | 'dispute', comment?: string): Promise<void> => {
    await apiClient.patch(`/reports/${reportId}/my-verification/`, { vote, comment })
  },

  getPotentialDuplicates: async (reportId: number): Promise<PotentialDuplicate[]> => {
    const { data } = await apiClient.get<any>(`/reports/${reportId}/potential-duplicates/`)
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    return []
  },
}
