import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, UserCheck, UserX, Users } from 'lucide-react'
import { usersApi } from '@/features/users/api'
import { useAuth } from '@/context/AuthContext'
import { parseApiError } from '@/lib/apiErrors'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/features/reports/meta'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/ui/PageHeader'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { AdminUser, PaginatedResponse } from '@/types'

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 400)
  const [active, setActive] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setData(null)
    setError(null)
    const params: Record<string, string | number> = { page }
    if (debounced) params.search = debounced
    if (active) params.is_active = active
    try {
      setData(await usersApi.getAll(params))
    } catch (err) {
      setError(parseApiError(err, 'Could not load users.').message)
    }
  }, [page, debounced, active])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => setPage(1), [debounced, active])

  const toggle = async () => {
    if (!pending) return
    setBusy(true)
    setActionError(null)
    try {
      await usersApi.updateStatus(pending.id, { is_active: !pending.is_active })
      toast.success(pending.is_active ? 'Account deactivated.' : 'Account reactivated.')
      setPending(null)
      load()
    } catch (err) {
      setActionError(parseApiError(err, 'Could not update the account.').message)
    } finally {
      setBusy(false)
    }
  }

  const users = data?.results ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <>
      <PageHeader title="Users" description="Registered community members and moderators." />
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-7">
          <div className="ag-search">
            <Search size={18} className="ag-search-icon" aria-hidden="true" />
            <label htmlFor="user-search" className="visually-hidden">Search users</label>
            <input id="user-search" type="search" className="form-control" placeholder="Search name, username or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="col-12 col-md-5">
          <div className="ag-chips" role="group" aria-label="Filter by account status">
            {([['', 'All'], ['true', 'Active'], ['false', 'Deactivated']] as const).map(([v, l]) => (
              <button key={l} type="button" className="ag-chip" aria-pressed={active === v} onClick={() => setActive(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!data && !error ? (
        <ReportListSkeleton count={4} label="Loading users" />
      ) : data && users.length === 0 ? (
        <div className="ag-card"><EmptyState icon={Users} title="No users found" description="Try a different search." /></div>
      ) : data ? (
        <>
          <p className="small text-muted" aria-live="polite">{data.count} user{data.count === 1 ? '' : 's'}</p>
          <ul className="ag-list ag-list-plain">
            {users.map((u) => (
              <li key={u.id} className="ag-card ag-card-body d-flex flex-column flex-sm-row align-items-sm-center gap-2">
                <div className="flex-grow-1 ag-min-w-0">
                  <div className="fw-semibold text-truncate">{u.full_name || u.username}</div>
                  <div className="small text-muted text-truncate">{u.email}</div>
                  <div className="ag-report-meta mt-1">
                    <span className={`ag-badge ${u.role === 'admin' ? 'ag-badge-info' : 'ag-badge-neutral'}`}>{u.role === 'admin' ? 'Administrator' : 'User'}</span>
                    <span className={`ag-badge ${u.is_active ? 'ag-badge-success' : 'ag-badge-danger'}`}>
                      {u.is_active ? <UserCheck size={12} aria-hidden="true" /> : <UserX size={12} aria-hidden="true" />}
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                    <span>Joined {formatDate(u.date_joined)}</span>
                  </div>
                </div>
                {u.id !== me?.id && (
                  <button
                    type="button"
                    className={`btn btn-sm ${u.is_active ? 'btn-outline-secondary text-danger' : 'btn-outline-primary'}`}
                    onClick={() => { setActionError(null); setPending(u) }}
                  >
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                    <span className="visually-hidden"> {u.email}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="d-flex align-items-center justify-content-center gap-2 mt-3" aria-label="Pagination">
              <button type="button" className="btn btn-outline-secondary" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={18} aria-hidden="true" /> Previous
              </button>
              <span className="small text-muted px-2">Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-outline-secondary" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.is_active ? 'Deactivate this account?' : 'Reactivate this account?'}
        message={
          pending?.is_active
            ? `${pending.email} will no longer be able to log in. Their reports stay visible.`
            : `${pending?.email ?? ''} will be able to log in again.`
        }
        confirmLabel={pending?.is_active ? 'Deactivate' : 'Reactivate'}
        tone={pending?.is_active ? 'danger' : 'primary'}
        busy={busy}
        error={actionError}
        onConfirm={toggle}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
