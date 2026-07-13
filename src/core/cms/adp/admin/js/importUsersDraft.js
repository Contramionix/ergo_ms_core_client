/** Черновик welcome-email для ImportUsers — только in-memory (без sessionStorage). */

let welcomeEmailDraft = null

export function saveWelcomeEmailDraft(payload) {
  if (!payload || typeof payload !== 'object') {
    return
  }
  welcomeEmailDraft = {
    sendWelcomeEmails: Boolean(payload.sendWelcomeEmails),
    subject: typeof payload.subject === 'string' ? payload.subject : '',
    body: typeof payload.body === 'string' ? payload.body : '',
  }
}

export function loadWelcomeEmailDraft() {
  return welcomeEmailDraft ? { ...welcomeEmailDraft } : null
}

export function clearWelcomeEmailDraft() {
  welcomeEmailDraft = null
}
