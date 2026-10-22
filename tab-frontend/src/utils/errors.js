// Turns any axios/DRF error into a short, human-friendly message.
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.code === 'ERR_NETWORK' || (!err.response && err.request)) {
    return "Can't reach the server. Check your connection and try again."
  }
  if (err.code === 'ECONNABORTED') return 'The request took too long. Please try again.'

  const status = err.response?.status
  const data = err.response?.data

  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.'
  if (status === 429) return 'Too many attempts. Please wait a bit and try again.'
  if (status === 413) return 'That file is too large.'
  if (status === 401 && !data?.detail) return 'Your session has expired. Please log in again.'

  const first = (v) => (Array.isArray(v) ? first(v[0]) : v)
  if (data && typeof data === 'object') {
    if (data.detail) return String(first(data.detail))
    if (data.non_field_errors) return String(first(data.non_field_errors))
    for (const value of Object.values(data)) {
      const msg = first(value)
      if (typeof msg === 'string') return msg
    }
  }
  if (status === 401 && data?.detail) return String(first(data.detail))
  if (status === 404) return 'We could not find that. It may have been removed.'
  if (status === 403) return "You don't have permission to do that."
  return fallback
}
