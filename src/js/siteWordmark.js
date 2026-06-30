export const DEFAULT_SITE_NAME = 'ERGOMS'

export function splitSiteName(name = DEFAULT_SITE_NAME) {
  const value = (name || DEFAULT_SITE_NAME).trim()
  const matchIndex = value.search(/o/i)

  if (matchIndex === -1) {
    return { prefix: value, suffix: '', hasCog: false }
  }

  return {
    prefix: value.slice(0, matchIndex),
    suffix: value.slice(matchIndex + 1),
    hasCog: true,
  }
}

export function getSiteWordmarkText(name = DEFAULT_SITE_NAME) {
  const { prefix, suffix, hasCog } = splitSiteName(name)
  return hasCog ? `${prefix}\u2699${suffix}` : (name || DEFAULT_SITE_NAME).trim()
}
