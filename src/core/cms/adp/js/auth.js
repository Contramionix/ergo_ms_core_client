import { apiClient } from '../../../../js/api/manager';
import { endpoints } from '../../../../js/api/endpoints';
import Cookies from 'js-cookie';
import tokenService from '@/core/cms/js/tokenService'

export const authService = {
    async login(username, password, rememberMe = false) {
        const response = await apiClient.post(endpoints.auth.login, {
            username,
            password,
            remember_me: rememberMe,
        }, false);
        
        if (response.success) {
            tokenService.setTokens(response.data.access, response.data.refresh)
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
    
    async sendConfirmationCode(email) {
        return await apiClient.post(endpoints.auth.sendCode, { email }, false);
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
        const token = Cookies.get('token');
        if (!token) {
            return false;
        }
        
        try {
            // Используем /protected/ для проверки токена (возвращает пустой ответ при успехе)
            const response = await apiClient.get(endpoints.auth.protected);
            return response.success;
        } catch (error) {
            // Если токен недействителен (401), очищаем все cookies
            if (error.response?.status === 401) {
                this.logout();
            }
            return false;
        }
    },
    
    logout() {
        tokenService.clear()
        
        // Очищаем активную организацию при выходе
        try {
            const STORAGE_KEY = 'crm_active_organization'
            localStorage.removeItem(STORAGE_KEY)
        } catch (error) {
            console.error('Ошибка очистки активной организации при выходе:', error)
        }
    }
};  