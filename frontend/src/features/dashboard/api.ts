import apiClient from '@/lib/axios'
import type { DashboardStats } from '@/types'

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get<DashboardStats>('/dashboard/stats/')
  return data
}
