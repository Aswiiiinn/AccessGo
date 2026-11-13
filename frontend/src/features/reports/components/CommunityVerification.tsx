import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThumbsDown, ThumbsUp, Users } from 'lucide-react'
import { verificationApi } from '@/features/verification/api'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate } from '@/features/reports/meta'
import Dialog from '@/components/ui/Dialog'
import LoadingButton from '@/components/ui/LoadingButton'
import ChoiceCards from '@/components/ui/ChoiceCards'
import ConfirmDialog from '@/components/ConfirmDialog'
import Notice from '@/components/ui/Notice'
import { useToast } from '@/components/ui/Toast'
import type { AccessibilityReport, ReportVerification, VerificationVote } from '@/types'

interface CommunityVerificationProps {
  report: AccessibilityReport
  verifications: ReportVerification[]
  currentUserEmail: string | null
  /** Reload report + verifications after a change. */
  onChanged: () => Promise<void> | void
}

export function useVerificationState(report: AccessibilityReport, verifications: ReportVerification[], currentUserEmail: string | null) {
  const isAuthor = !!currentUserEmail && report.author === currentUserEmail
  const myVote = currentUserEmail ? verifications.find((v) => v.verifier === currentUserEmail) ?? null : null
  const canVote = !!currentUserEmail && !isAuthor && report.status !== 'rejected'
  return { isAuthor, myVote, canVote }
}

/**
 * Community confirm/dispute votes — explicitly separate from moderator approval.
 * Exposes `openVote` through the returned element's buttons and an optional sticky bar.
 */
export default function CommunityVerification({ report, verifications, currentUserEmail, onChanged }: CommunityVerificationProps) {
  const toast = useToast()
  const location = useLocation()
  const { isAuthor, myVote, canVote } = useVerificationState(report, verifications, currentUserEmail)
  const [dialogVote, setDialogVote] = useState<VerificationVote | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const commentId = useId()

  const openVote = (vote: VerificationVote) => {
    setDialogVote(vote)
    setComment(myVote?.vote === vote ? myVote.comment : '')
    setError(null)
  }

  const submit = async () => {
    if (!dialogVote) return
    setSaving(true)
    setError(null)
    try {
      if (myVote) await verificationApi.update(report.id, dialogVote, comment.trim())
      else await verificationApi.verify(report.id, dialogVote, comment.trim())
      setDialogVote(null)
      toast.success(dialogVote === 'confirm' ? 'Thanks — you confirmed this issue.' : 'Thanks — you disputed this report.')
      await onChanged()
    } catch (err) {
      setError(parseApiError(err, 'Your vote could not be saved.').message)
    } finally {
      setSaving(false)
    }
  }

  const withdraw = async () => {
    setWithdrawing(true)
    try {
      await verificationApi.withdraw(report.id)
      setConfirmWithdraw(false)
      toast.info('Your vote was removed.')
      await onChanged()
    } catch (err) {
      toast.error(parseApiError(err, 'Could not remove your vote.').message)
    } finally {
      setWithdrawing(false)
    }
  }

  const voteButtons = (size: '' | 'btn-lg') => (
    <>
      <button
        type="button"
        className={`btn ${size} ${myVote?.vote === 'confirm' ? 'btn-success' : 'btn-outline-primary'}`}
        onClick={() => openVote('confirm')}
        aria-pressed={myVote?.vote === 'confirm'}
      >
        <ThumbsUp size={18} aria-hidden="true" />
        {myVote?.vote === 'confirm' ? 'Confirmed' : 'Confirm'}
      </button>
      <button
        type="button"
        className={`btn ${size} ${myVote?.vote === 'dispute' ? 'btn-danger' : 'btn-outline-primary'}`}
        onClick={() => openVote('dispute')}
        aria-pressed={myVote?.vote === 'dispute'}
      >
        <ThumbsDown size={18} aria-hidden="true" />
        {myVote?.vote === 'dispute' ? 'Disputed' : 'Dispute'}
      </button>
    </>
  )

  return (
    <section className="ag-card ag-card-body" aria-labelledby="verify-heading">
      <div className="d-flex align-items-center gap-2 mb-1">
        <Users size={18} aria-hidden="true" />
        <h2 id="verify-heading" className="h3 mb-0">Community verification</h2>
      </div>
      <p className="small text-muted">
        People who have seen this place confirm the issue is still there, or dispute it if it isn't. This is separate from a
        moderator's review.
      </p>

      <dl className="ag-stats mb-3">
        <div className="ag-stat">
          <dt className="ag-stat-label"><ThumbsUp size={14} aria-hidden="true" /> Confirmed</dt>
          <dd className="ag-stat-value mb-0" style={{ color: 'var(--ag-success)' }}>{report.confirm_count ?? 0}</dd>
        </div>
        <div className="ag-stat">
          <dt className="ag-stat-label"><ThumbsDown size={14} aria-hidden="true" /> Disputed</dt>
          <dd className="ag-stat-value mb-0" style={{ color: 'var(--ag-danger)' }}>{report.dispute_count ?? 0}</dd>
        </div>
      </dl>

      {!currentUserEmail ? (
        <Notice tone="neutral">
          <Link to="/login" state={{ from: location.pathname }}>Log in</Link> to confirm or dispute this report.
        </Notice>
      ) : isAuthor ? (
        <Notice tone="neutral">You can't verify your own report — other community members will.</Notice>
      ) : report.status === 'rejected' ? (
        <Notice tone="neutral">Rejected reports can't receive new votes.</Notice>
      ) : (
        <>
          {myVote && (
            <p className="small mb-2" role="status">
              You {myVote.vote === 'confirm' ? 'confirmed' : 'disputed'} this on {formatDate(myVote.updated_at)}.{' '}
              <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setConfirmWithdraw(true)}>
                Remove my vote
              </button>
            </p>
          )}
          <div className="d-none d-lg-flex gap-2">{voteButtons('')}</div>
        </>
      )}

      {verifications.some((v) => v.comment) && (
        <div className="mt-3">
          <h3 className="h6 mb-2">Comments</h3>
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {verifications
              .filter((v) => v.comment)
              .map((v) => (
                <li key={v.id} className="small p-3 rounded" style={{ background: 'var(--ag-surface-muted)' }}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className={`ag-badge ${v.vote === 'confirm' ? 'ag-badge-success' : 'ag-badge-danger'}`}>
                      {v.vote === 'confirm' ? <ThumbsUp size={12} aria-hidden="true" /> : <ThumbsDown size={12} aria-hidden="true" />}
                      {v.vote === 'confirm' ? 'Confirmed' : 'Disputed'}
                    </span>
                    <span className="text-muted">
                      {v.verifier === currentUserEmail ? 'You' : 'Community member'} · {formatDate(v.created_at)}
                    </span>
                  </div>
                  <p className="mb-0 ag-break">{v.comment}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Phones/tablets: keep the primary actions within thumb reach. */}
      {canVote && <div className="ag-action-bar d-lg-none">{voteButtons('btn-lg')}</div>}

      <Dialog
        open={dialogVote !== null}
        onClose={() => setDialogVote(null)}
        title={myVote ? 'Change your vote' : 'Verify this report'}
        dismissible={!saving}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setDialogVote(null)} disabled={saving}>Cancel</button>
            <LoadingButton className="btn btn-primary" loading={saving} onClick={submit}>
              {myVote ? 'Update vote' : 'Submit vote'}
            </LoadingButton>
          </>
        }
      >
        <ChoiceCards
          name="vote"
          legend="Your answer"
          layout="list"
          value={dialogVote ?? ''}
          onChange={(v) => setDialogVote(v as VerificationVote)}
          choices={[
            { value: 'confirm', label: 'Confirm — the issue is there', description: 'I have seen this barrier recently.', icon: ThumbsUp },
            { value: 'dispute', label: 'Dispute — it isn’t accurate', description: 'It’s fixed, never existed, or the details are wrong.', icon: ThumbsDown },
          ]}
        />
        <div className="mt-3">
          <label htmlFor={commentId} className="form-label">Comment (optional)</label>
          <textarea
            id={commentId}
            className="form-control"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Still broken as of this morning."
          />
        </div>
        {error && <Notice tone="danger" className="mt-3">{error}</Notice>}
      </Dialog>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Remove your vote?"
        message="Your confirmation or dispute will be removed from this report."
        confirmLabel="Remove vote"
        tone="danger"
        busy={withdrawing}
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </section>
  )
}
