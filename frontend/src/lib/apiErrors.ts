import axios from 'axios'

export type FieldErrors = Record<string, string[]>

export interface ParsedApiError {
  /** A message suitable for a top-level alert. */
  message: string
  /** Per-field messages keyed by the backend field name. */
  fieldErrors: FieldErrors
  status: number | null
}

const toMessages = (value: unknown): string[] => {
  if (value == null) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(toMessages)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(toMessages)
  return [String(value)]
}

/**
 * Normalises errors from the Django API.
 *
 * The backend wraps DRF errors as `{ error, status_code, detail }`, where `detail` is
 * either a string (`"Authentication credentials were not provided."`) or a dict of
 * field -> messages (`{ new_password: ["This password is too common."] }`).
 */
export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (!axios.isAxiosError(err)) {
    return { message: fallback, fieldErrors: {}, status: null }
  }
  if (!err.response) {
    return {
      message: 'Unable to reach the server. Check your connection and try again.',
      fieldErrors: {},
      status: null,
    }
  }

  const status = err.response.status
  const data = err.response.data as Record<string, unknown> | string | undefined
  const body = data && typeof data === 'object' && 'detail' in data ? data.detail : data

  if (status === 429) {
    return { message: 'Too many attempts. Please wait a while and try again.', fieldErrors: {}, status }
  }

  if (typeof body === 'string') {
    return { message: body || fallback, fieldErrors: {}, status }
  }

  const fieldErrors: FieldErrors = {}
  const general: string[] = []
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body)) {
      const messages = toMessages(value)
      if (key === 'detail' || key === 'non_field_errors' || key === 'code' || key === 'messages') {
        if (key !== 'code' && key !== 'messages') general.push(...messages)
      } else {
        fieldErrors[key] = messages
      }
    }
  } else {
    general.push(...toMessages(body))
  }

  const message =
    general[0] ??
    (Object.keys(fieldErrors).length > 0 ? 'Please correct the highlighted fields.' : fallback)
  return { message, fieldErrors, status }
}
