/** "Aleksei Nogueira Colaco" → { surname: "Colaco", given: "Aleksei Nogueira" }.
 *  Last whitespace token is the surname; the rest join as given names. A single-
 *  word name returns it as the surname with no given names (no comma when rendered). */
export function formatNameAmericanStyle(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { surname: parts[0] || '', given: '' }
  return { surname: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') }
}
