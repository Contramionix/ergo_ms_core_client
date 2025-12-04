export const categoriesEndpoints = {
    file: 'settings/file/',
    audit: 'settings/audit-logs/',
    categories: {
        list: 'settings/categories/',
        create: 'settings/categories/',
        update: id => `settings/categories/${id}/`,
        delete: id => `settings/categories/${id}/`
    },
    tags: {
        list: 'settings/tags/',
        create: 'settings/tags/',
        update: id => `settings/tags/${id}/`,
        delete: id => `settings/tags/${id}/`
    },
    userAvatars: {
        list: 'settings/user-avatars/',
        create: 'settings/user-avatars/',
        delete: id => `settings/user-avatars/${id}/`
    },
    settings: {
        generalSettings: 'settings/general-settings/',
        lastSettings: 'settings/general-settings/last/',
        mediaSettings: 'settings/media-settings/',
        permalinkSettings: 'settings/permalink-settings/',
        emailSettings: 'settings/email-settings/',
        securitySettings: 'settings/security-settings/',
        appearanceSettings: 'settings/appearance-settings/',
        appearanceLastSettings: 'settings/appearance-settings/last/',
        exportTheme: 'settings/appearance-settings/export-theme/',
        importTheme: 'settings/appearance-settings/import-theme/',
    },
    themes: {
        list: 'settings/themes/',
        create: 'settings/themes/',
        get: id => `settings/themes/${id}/`,
        update: id => `settings/themes/${id}/`,
        delete: id => `settings/themes/${id}/`,
        active: 'settings/themes/active/',
        activate: id => `settings/themes/${id}/activate/`,
        duplicate: id => `settings/themes/${id}/duplicate/`,
        export: id => `settings/themes/${id}/export/`,
        import: 'settings/themes/import/',
        createSystemThemes: 'settings/themes/create-system-themes/'
    }
};

