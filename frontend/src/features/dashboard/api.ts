import apiClient from '@/lib/axios'
import type { DashboardStatistics } from '@/types'

export const dashboardApi = {
  getStatistics: async (): Promise<DashboardStatistics> => {
    const { data } = await apiClient.get<DashboardStatistics>('/dashboard/statistics/')
    return data
  },

  getReportsByCategory: async () => {
    const { data } = await apiClient.get('/dashboard/reports-by-category/')
    return data
  },

  getReportsByStatus: async () => {
    const { data } = await apiClient.get('/dashboard/reports-by-status/')
    return data
  },

  getReportsOverTime: async (group: 'day' | 'month' = 'day') => {
    const { data } = await apiClient.get('/dashboard/reports-over-time/', { params: { group } })
    return data
  },

  getHighSeverityReports: async () => {
    const { data } = await apiClient.get('/dashboard/high-severity-reports/')
    return data
  },
}
