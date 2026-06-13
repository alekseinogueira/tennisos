// Pull a YouTube video id from the common URL shapes; null if it isn't one.
// Used by the student video screens to decide embed-inline vs. external link.
export function youtubeId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1) || null
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/?]+)/)
      if (m) return m[2]
    }
  } catch {
    return null
  }
  return null
}
