import apiClient from '@/lib/axios'
import type { ClassificationReview, ReportClassification } from '@/types'

export const aiApi = {
  /** Returns the ReportClassification record (author or admin only). */
  getClassification: async (reportId: number): Promise<ReportClassification> => {
    const { data } = await apiClient.get<ReportClassification>(`/reports/${reportId}/classification/`)
    return data
  },

  reviewClassification: async (reportId: number, action: 'accept' | 'reject', reason?: string): Promise<ClassificationReview> => {
    const { data } = await apiClient.post<ClassificationReview>(`/reports/${reportId}/classification/review/`, {
      action,
      reason,
    })
    return data
  },

  getClassificationReviews: async (reportId: number): Promise<ClassificationReview[]> => {
    const { data } = await apiClient.get<ClassificationReview[]>(`/reports/${reportId}/classification/reviews/`)
    return data
  },
}
