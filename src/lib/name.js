/** Capitalize the first letter of each whitespace-separated word, lowercasing the
 *  rest. "ALEKSEI NOGUEIRA" → "Aleksei Nogueira". */
function toTitleCase(str) {
  return str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/** "ALEKSEI NOGUEIRA COLACO" → { surname: "COLACO", given: "Aleksei Nogueira" }.
 *  Last whitespace token is the surname (rendered in Bebas display caps, so its
 *  source casing is irrelevant); the rest join as given names, normalized to title
 *  case so they read "Aleksei Nogueira" no matter how full_name was stored. A
 *  single-word name returns it as the surname with no given names. */
export function formatNameAmericanStyle(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { surname: parts[0] || '', given: '' }
  return {
    surname: parts[parts.length - 1],
    given: toTitleCase(parts.slice(0, -1).join(' ')),
  }
}
