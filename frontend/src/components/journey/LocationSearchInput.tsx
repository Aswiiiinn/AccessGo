import { useState, useEffect, useRef, useId, type KeyboardEvent } from 'react'
import { MapPin, X, LocateFixed, LoaderCircle, Search } from 'lucide-react'
import { searchLocation, toLocationPoint, type GeocodingResult, type LocationPoint } from '@/features/journey/geocoding'
import { useDebounce } from '@/hooks/useDebounce'

interface LocationSearchInputProps {
  label: string
  placeholder: string
  value: LocationPoint | null
  onChange: (point: LocationPoint | null) => void
  onUseCurrentLocation?: () => void
  locating?: boolean
  /** Render results inline (inside dialogs) instead of as a floating list. */
  inlineResults?: boolean
  autoFocus?: boolean
  /** Raw geocoder result, for callers that need the place type. */
  onSelectResult?: (result: GeocodingResult) => void
  error?: string | null
}

const shortName = (r: GeocodingResult) => r.display_name.split(',')[0]?.trim() || r.display_name
const restOfAddress = (r: GeocodingResult) => r.display_name.split(',').slice(1).join(',').trim()

/** WAI-ARIA combobox backed by OpenStreetMap Nominatim search. */
export default function LocationSearchInput({
  label,
  placeholder,
  value,
  onChange,
  onUseCurrentLocation,
  locating = false,
  inlineResults = false,
  autoFocus,
  onSelectResult,
  error: externalError,
}: LocationSearchInputProps) {
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const debounced = useDebounce(query, 400)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the text in sync when the value is set from outside (current location, swap),
  // but not when the change came from typing here (which clears the selected value).
  const typedRef = useRef(false)
  useEffect(() => {
    if (typedRef.current) {
      typedRef.current = false
      return
    }
    setQuery(value?.name ?? '')
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  useEffect(() => {
    // A selected value means the text is not a search query.
    if (value || debounced.trim().length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    searchLocation(debounced, ctrl.signal)
      .then((r) => {
        setResults(r)
        setActive(-1)
        setOpen(true)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError('Location search is unavailable. Check your connection and try again.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [debounced, value])

  const select = (r: GeocodingResult) => {
    const point = toLocationPoint(r)
    onSelectResult?.(r)
    onChange(point)
    setQuery(point.name)
    setOpen(false)
    setResults([])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      select(results[active])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
    }
  }

  const showList = open && results.length > 0
  const noResults = !loading && !error && debounced.trim().length >= 3 && results.length === 0 && !value && query === debounced
  const shownError = error ?? externalError
  const helpId = `${id}-help`

  return (
    <div ref={wrapperRef} className="position-relative">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="d-flex gap-2">
        <div className="ag-search flex-grow-1">
          <Search size={18} className="ag-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus={autoFocus}
            className={`form-control${shownError ? ' is-invalid' : ''}`}
            placeholder={placeholder}
            value={query}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
            aria-describedby={helpId}
            aria-invalid={!!shownError}
            onChange={(e) => {
              setQuery(e.target.value)
              if (value) {
                typedRef.current = true
                onChange(null)
              }
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            style={{ paddingRight: query ? 40 : undefined }}
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-icon position-absolute top-50 end-0 translate-middle-y"
              style={{ width: 40, height: 40 }}
              aria-label={`Clear ${label.toLowerCase()}`}
              onClick={() => {
                setQuery('')
                setResults([])
                onChange(null)
                inputRef.current?.focus()
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {onUseCurrentLocation && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-icon flex-shrink-0"
            style={{ borderRadius: 'var(--ag-radius-sm)' }}
            onClick={onUseCurrentLocation}
            disabled={locating}
            aria-label="Use my current location"
            title="Use my current location"
          >
            {locating ? <LoaderCircle size={18} className="ag-spin" aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      <div id={helpId} className="form-text" aria-live="polite">
        {loading
          ? 'Searching…'
          : shownError
            ? <span className="text-danger">{shownError}</span>
            : noResults
              ? 'No places found. Try a different name or address.'
              : showList
                ? `${results.length} suggestion${results.length === 1 ? '' : 's'}. Use arrow keys to choose.`
                : query && !value && query.trim().length < 3
                  ? 'Type at least 3 characters.'
                  : null}
      </div>
      <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className={`ag-suggestions${inlineResults ? ' ag-suggestions-static' : ''}`} hidden={!showList}>
        {results.map((r, i) => (
          <li
            key={r.place_id}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className="ag-suggestion"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(r)}
          >
            <MapPin size={16} aria-hidden="true" />
            <span className="ag-min-w-0">
              <span className="ag-suggestion-main d-block">{shortName(r)}</span>
              <span className="ag-suggestion-sub d-block text-truncate">{restOfAddress(r)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
