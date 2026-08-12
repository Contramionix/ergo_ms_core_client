/** Алфавиты для AlphabetFilter (кириллица / латиница / оба). */

export const CYRILLIC_SURNAME_LETTERS = Object.freeze([
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М',
  'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ю', 'Я',
])

export const LATIN_SURNAME_LETTERS = Object.freeze([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
])

export const ALPHABET_MODES = Object.freeze(['cyrillic', 'latin', 'all'])

/** @typedef {'cyrillic' | 'latin' | 'all'} AlphabetMode */

const ALL_SURNAME_LETTERS = Object.freeze([
  ...CYRILLIC_SURNAME_LETTERS,
  ...LATIN_SURNAME_LETTERS,
])

/**
 * @param {AlphabetMode} [alphabet='cyrillic']
 * @returns {readonly string[]}
 */
export function resolveAlphabetLetters(alphabet = 'cyrillic') {
  if (alphabet === 'latin') {
    return LATIN_SURNAME_LETTERS
  }
  if (alphabet === 'all') {
    return ALL_SURNAME_LETTERS
  }
  return CYRILLIC_SURNAME_LETTERS
}
