import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import tokenService from '@/core/cms/js/tokenService'
import { isExpired } from '@/core/cms/js/tokenStorage.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { performServerLogout, restoreSession, invalidateSessionRestoreCache, resetServerLogoutGate } from '@/core/cms/js/tokenRefresh.js'
import { resetPresenceConnection } from '@/core/cms/adp/js/presence/usePresenceConnection.js'
import { resetPresenceStore } from '@/core/cms/adp/js/presence/presenceStore.js'
import { showBootstrapMask } from '@/js/bootstrapMask.js'

const TOKEN_CHECK_TTL_MS = 60 * 1000
let tokenCheckCache = { at: 0, result: false }

function resetTokenCheckCache() {
  tokenCheckCache = { at: 0, result: false }
}

export const authService = {
    async login(username, password, rememberMe = false) {
        const response = await apiClient.post(endpoints.auth.login, {
            username,
            password,
            remember_me: rememberMe,
        }, false);
        
        if (response.success && response.data?.access) {
            tokenService.setTokens(response.data.access)
            resetServerLogoutGate()
            if (tokenService.hasActiveSessionScope()) {
                window.dispatchEvent(new CustomEvent('session-scope-changed'))
            }
        }
        
        return response;
    },
    
    async validateRegistration(firstName, lastName, middleName, username, email, password) {
        return await apiClient.post(endpoints.auth.validateRegistration, {
            first_name: firstName,
            last_name: lastName || '',
            middle_name: middleName || '',
            username,
            email,
            password
        }, false);
    },
    
    async sendConfirmationCode(email, purpose = '') {
        const payload = { email }
        if (purpose) {
            payload.purpose = purpose
        }
        return await apiClient.post(endpoints.auth.sendCode, payload, false);
    },
    
    async verifyConfirmationCode(email, code) {
        return await apiClient.post(endpoints.auth.verifyCode, { email, code }, false);
    },
    
    async resetPassword(email, code, newPassword, confirmPassword) {
        return await apiClient.post(endpoints.auth.resetPassword, {
            email,
            code,
            new_password: newPassword,
            confirm_password: confirmPassword
        }, false);
    },
    
    async registration(firstName, lastName, middleName, username, email, password, invitationToken = '') {
        return await apiClient.post(endpoints.auth.registration, {
            first_name: firstName,
            last_name: lastName || '',
            middle_name: middleName || '',
            username,
            email,
            password,
            invitation_token: invitationToken || '',
        }, false);
    },
    
    async checkToken({ force = false } = {}) {
        const access = tokenService.getAccess()
        if (access && !isExpired(access)) {
            if (!force) {
                try {
                    const userStore = useUserStore()
                    if (userStore.isInitialized && userStore.isAuthenticated) {
                        const now = Date.now()
                        if (now - tokenCheckCache.at < TOKEN_CHECK_TTL_MS) {
                            return tokenCheckCache.result
                        }
                    }
                } catch (_) {
                    /* store ещё не готов */
                }
            }

            try {
                const userStore = useUserStore()
                // F5: наполняем session-bootstrap (access_to_panel), не только «токен жив».
                if (!userStore.isInitialized) {
                    const ok = Boolean(await userStore.loadSessionBootstrap())
                    tokenCheckCache = { at: Date.now(), result: ok }
                    return ok
                }
                const response = await apiClient.get(endpoints.auth.sessionBootstrap)
                tokenCheckCache = { at: Date.now(), result: response.success }
                return response.success
            } catch (error) {
                // Не auth.logout() (redirect): иначе 401 → /login → restore → AppHome → 401…
                // Серверный logout делает интерцептор apiClient / guard.
                if (error.response?.status === 401) {
                    resetTokenCheckCache()
                    tokenService.clear()
                    invalidateSessionRestoreCache()
                    await performServerLogout()
                } else {
                    resetTokenCheckCache()
                }
                return false
            }
        }

        try {
            const restored = await restoreSession()
            if (restored) {
                tokenCheckCache = { at: Date.now(), result: true }
            }
            return restored
        } catch {
            resetTokenCheckCache()
            return false
        }
    },
    
    async logout() {
        resetTokenCheckCache()
        showBootstrapMask()
        resetPresenceConnection()
        resetPresenceStore()
        await performServerLogout()
        invalidateSessionRestoreCache()
        tokenService.clear()
        try {
            useUserStore().finalizeSession()
        } catch {
            /* store ещё не готов */
        }
        window.location.href = '/login'
    }
};
