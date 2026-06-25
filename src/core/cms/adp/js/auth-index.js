// Динамические экспорты для избежания конфликта с динамическим импортом в authGuard.js
export const authorization = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.login(...args);
};

export const validateRegistration = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.validateRegistration(...args);
};

export const sendConfirmationCode = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.sendConfirmationCode(...args);
};

export const verifyConfirmationCode = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.verifyConfirmationCode(...args);
};

export const resetPassword = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.resetPassword(...args);
};

export const registration = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.registration(...args);
};

export const fetchRegistrationSettings = async (...args) => {
    const { fetchRegistrationSettings: fetchSettings } = await import('@/core/cms/adp/js/registrationSettings');
    return fetchSettings(...args);
};

export const validateInvitationToken = async (...args) => {
    const { validateInvitationToken: validateToken } = await import('@/core/cms/adp/js/registrationSettings');
    return validateToken(...args);
};

export const fetchPasswordResetSettings = async (...args) => {
    const { fetchPasswordResetSettings: fetchSettings } = await import('@/core/cms/adp/js/passwordResetSettings');
    return fetchSettings(...args);
};

export const checkToken = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.checkToken(...args);
};

export const logout = async (...args) => {
    const { authService } = await import('@/core/cms/adp/js/auth');
    return authService.logout(...args);
};