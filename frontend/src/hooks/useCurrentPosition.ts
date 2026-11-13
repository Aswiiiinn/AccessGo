import { useCallback, useState } from 'react'

export interface Coords {
  lat: number
  lng: number
}

const PERMISSION_HELP =
  'Location access is blocked for this site. Click the lock or site-settings icon in the address bar, allow Location, then try again — or search for a place instead.'

function getPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options))
}

function describeError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return PERMISSION_HELP
    case err.POSITION_UNAVAILABLE:
      return "Your device couldn't determine its location. Check that Location is turned on in your device settings, or search for a place instead."
    case err.TIMEOUT:
      return 'Finding your location took too long. Please try again, or search for a place instead.'
    default:
      return 'We could not find your location. Please search for a place instead.'
  }
}

/**
 * Requests the device location only when `locate()` is called (i.e. after a user action).
 * Tries a precise fix first, then falls back to a faster network-based fix — desktops
 * without GPS often fail or time out with high accuracy.
 */
export function useCurrentPosition() {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = useCallback(async (): Promise<Coords | null> => {
    setError(null)
    if (!('geolocation' in navigator)) {
      setError('Location is not available in this browser. Please search for a place instead.')
      return null
    }
    // Browsers only expose geolocation on HTTPS or localhost.
    if (!window.isSecureContext) {
      setError(
        `Your browser only shares location with secure sites (HTTPS or localhost). This page is open at ${window.location.origin}. Please search for a place instead.`
      )
      return null
    }
    try {
      const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      if (status?.state === 'denied') {
        setError(PERMISSION_HELP)
        return null
      }
    } catch {
      /* Permissions API not supported for geolocation (e.g. older Safari) — just ask. */
    }

    setLocating(true)
    try {
      let pos: GeolocationPosition
      try {
        pos = await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
      } catch (err) {
        const e = err as GeolocationPositionError
        if (e.code === e.PERMISSION_DENIED) throw e
        pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 })
      }
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch (err) {
      const e = err as GeolocationPositionError
      if ((import.meta as any).env?.DEV) console.warn('Geolocation failed', e.code, e.message)
      setError(describeError(e))
      return null
    } finally {
      setLocating(false)
    }
  }, [])

  return { locate, locating, error, clearError: () => setError(null) }
}
