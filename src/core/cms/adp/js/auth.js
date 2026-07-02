import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import tokenService from '@/core/cms/js/tokenService'
import { isExpired } from '@/core/cms/js/tokenStorage.js'
import { performServerLogout, restoreSession, invalidateSessionRestoreCache } from '@/core/cms/js/tokenRefresh.js'
import { resetPresenceConnection } from '@/core/cms/adp/js/presence/usePresenceConnection.js'
import { resetPresenceStore } from '@/core/cms/adp/js/presence/presenceStore.js'

export const authService = {
    async login(username, password, rememberMe = false) {
        const response = await apiClient.post(endpoints.auth.login, {
            username,
            password,
            remember_me: rememberMe,
        }, false);
        
        if (response.success && response.data?.access) {
            tokenService.setTokens(response.data.access)
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
    
    async checkToken() {
        const access = tokenService.getAccess()
        if (access && !isExpired(access)) {
            try {
                const response = await apiClient.get(endpoints.auth.protected)
                return response.success
            } catch (error) {
                if (error.response?.status === 401) {
                    await this.logout()
                }
                return false
            }
        }

        try {
            return await restoreSession()
        } catch {
            return false
        }
    },
    
    async logout() {
        resetPresenceConnection()
        resetPresenceStore()
        await performServerLogout()
        invalidateSessionRestoreCache()
        tokenService.clear()
    }
};
