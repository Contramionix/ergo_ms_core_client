/**
 * Client-контракт: какие JWT claim гейтят активный session-scope.
 *
 * Модуль-владелец домена регистрирует имя claim:
 *   bridge.provideMany(SESSION_SCOPE_GATING_CLAIM_GROUP, 'my_scope', 'my_scope_id')
 *
 * Ядро (tokenStorage.hasActiveSessionScope) считает scope активным, если в payload
 * присутствуют все зарегистрированные gating-claim. Без зарегистрированных claim
 * понятие scope отсутствует.
 */

import bridge from '@/integrations/ModuleBridge.js'

export const SESSION_SCOPE_GATING_CLAIM_GROUP = 'session.scope_gating_claim'

export function getSessionScopeGatingClaims() {
  return Object.values(bridge.all(SESSION_SCOPE_GATING_CLAIM_GROUP)).filter(
    (claim) => typeof claim === 'string' && claim.length > 0,
  )
}
