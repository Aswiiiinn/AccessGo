import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import type { ReportFilters as ReportFiltersType } from '@/types'

export interface ReportFiltersProps {
  filters: ReportFiltersType
  onFilterChange: (filters: ReportFiltersType) => void
  onReset: () => void
}

export const ReportFilters = ({ filters, onFilterChange, onReset }: ReportFiltersProps) => {
  const [status, setStatus] = useState(filters.status || '')
  const [category, setCategory] = useState(filters.category || '')
  const [severity, setSeverity] = useState(filters.severity || '')
  const [search, setSearch] = useState(filters.search || '')
  const debouncedSearch = useDebounce(search, 300)

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value)
    onFilterChange({ ...filters, status: e.target.value })
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value)
    onFilterChange({ ...filters, category: e.target.value })
  }

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeverity(e.target.value)
    onFilterChange({ ...filters, severity: e.target.value })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    onFilterChange({ ...filters, search: e.target.value })
  }

  return (
    <div className="card mb-4 border-0 shadow-sm">
      <div className="card-header bg-navy text-white">
        <h5 className="mb-0">Filters</h5>
      </div>
      <div className="card-body p-3">
        <div className="row g-3">
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              onChange={handleStatusChange}
              value={status || ''}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              onChange={handleCategoryChange}
              value={category || ''}
            >
              <option value="">All Categories</option>
              <option value="elevator">Elevator</option>
              <option value="ramp">Ramp</option>
              <option value="tactile_paving">Tactile Paving</option>
              <option value="accessible_toilet">Accessible Toilet</option>
              <option value="hearing_loop">Hearing Loop</option>
              <option value="braille_signage">Braille Signage</option>
              <option value="step_free">Step-Free Access</option>
              <option value="pathway">Pathway</option>
              <option value="entrance">Entrance</option>
              <option value="parking">Parking</option>
              <option value="signage">Signage</option>
              <option value="obstacle">Obstacle</option>
              <option value="surface">Surface</option>
              <option value="lighting">Lighting</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              onChange={handleSeverityChange}
              value={severity || ''}
            >
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="col-md-3">
            <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Search title/description"
                value={debouncedSearch || ''}
                onChange={handleSearchChange}
              />
              <button className="btn btn-outline-primary" type="button">Go</button>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button
            className="btn btn-link text-muted small"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
