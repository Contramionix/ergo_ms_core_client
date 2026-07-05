export const DEFAULT_SITE_NAME = 'ERGOMS'

export function getSiteWordmarkText() {
  const matchIndex = DEFAULT_SITE_NAME.search(/o/i)

  if (matchIndex === -1) {
    return DEFAULT_SITE_NAME
  }

  const prefix = DEFAULT_SITE_NAME.slice(0, matchIndex)
  const suffix = DEFAULT_SITE_NAME.slice(matchIndex + 1)
  return `${prefix}\u2699${suffix}`
}
