import { useCallback, useEffect, useState } from 'react'
import { dashboardApi } from '@/features/dashboard/api'
import { parseApiError } from '@/lib/apiErrors'
import { getCategory, getStatus } from '@/features/reports/meta'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageHeader from '@/components/ui/PageHeader'
import { HorizontalBarChart, TrendLineChart, type Datum } from '../charts'
import type { ReportByCategory, ReportByStatus, ReportsOverTime } from '@/types'

export default function AdminAnalyticsPage() {
  const [group, setGroup] = useState<'day' | 'month'>('month')
  const [byCategory, setByCategory] = useState<Datum[] | null>(null)
  const [byStatus, setByStatus] = useState<Datum[] | null>(null)
  const [overTime, setOverTime] = useState<Datum[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [cat, st] = await Promise.all([
        dashboardApi.getReportsByCategory() as Promise<ReportByCategory[]>,
        dashboardApi.getReportsByStatus() as Promise<ReportByStatus[]>,
      ])
      setByCategory(
        cat
          .map((c) => ({ label: c.category ? getCategory(c.category).label : 'Uncategorised', value: c.count }))
          .sort((a, b) => b.value - a.value)
      )
      setByStatus(st.map((s) => ({ label: getStatus(s.status).label, value: s.count })).sort((a, b) => b.value - a.value))
    } catch (err) {
      setError(parseApiError(err, 'Could not load analytics.').message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setOverTime(null)
    ;(dashboardApi.getReportsOverTime(group) as Promise<ReportsOverTime>)
      .then((r) =>
        setOverTime(
          r.results.map((p) => ({
            label: p.period
              ? new Date(p.period).toLocaleDateString(undefined, group === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' })
              : '—',
            value: p.count,
          }))
        )
      )
      .catch(() => setOverTime([]))
  }, [group])

  return (
    <>
      <PageHeader title="Analytics" description="How reports are distributed and how activity changes over time." />
      {error && <ErrorMessage message={error} onRetry={load} />}
      <div className="row g-3">
        <div className="col-12 d-flex justify-content-end">
          <div className="ag-chips" role="group" aria-label="Group reports over time by">
            <button type="button" className="ag-chip" aria-pressed={group === 'day'} onClick={() => setGroup('day')}>Daily</button>
            <button type="button" className="ag-chip" aria-pressed={group === 'month'} onClick={() => setGroup('month')}>Monthly</button>
          </div>
        </div>
        <div className="col-12">
          {overTime ? (
            <TrendLineChart title="Reports over time" description={group === 'month' ? 'New reports per month' : 'New reports per day'} data={overTime} />
          ) : (
            <LoadingSpinner label="Loading trend…" />
          )}
        </div>
        <div className="col-lg-6">
          {byStatus ? <HorizontalBarChart title="Reports by status" description="Current moderation status" data={byStatus} /> : !error && <LoadingSpinner />}
        </div>
        <div className="col-lg-6">
          {byCategory ? <HorizontalBarChart title="Reports by category" description="Type of barrier reported" data={byCategory} /> : !error && <LoadingSpinner />}
        </div>
      </div>
    </>
  )
}
