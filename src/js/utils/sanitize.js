import DOMPurify from 'dompurify'

const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'hr', 'sub', 'sup', 'mark', 'del', 'ins',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'style', 'src', 'alt',
    'width', 'height', 'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function sanitizeHtml(dirty, config = {}) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { ...DEFAULT_CONFIG, ...config })
}

export function sanitizeMinimal(dirty) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'span', 'p', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  })
}

export default { sanitizeHtml, sanitizeMinimal }
