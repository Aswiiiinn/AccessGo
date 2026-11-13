import { useEffect, useState } from 'react'

interface UseAsyncResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[]): UseAsyncResult<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true }))
    asyncFn()
      .then((result) => {
        if (!cancelled) {
          setState({ data: result, loading: false, error: null })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err : new Error('Unknown error') })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}